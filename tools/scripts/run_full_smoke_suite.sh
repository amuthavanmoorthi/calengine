#!/usr/bin/env bash
set -Eeuo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
COMPOSE_FILE="$REPO_ROOT/infra/docker/docker-compose.yml"
ENV_FILE="$REPO_ROOT/infra/docker/.env"
REPORT_DIR="$REPO_ROOT/docs/runbooks"
REPORT_FILE="$REPORT_DIR/BERSN_SMOKE_EVIDENCE_latest.md"
STACK_STARTED=0
CURRENT_STEP=""
COMPOSE_DRIVER=""

mkdir -p "$REPORT_DIR"

timestamp_utc() {
  date -u +"%Y-%m-%dT%H:%M:%SZ"
}

append_report() {
  printf "%s\n" "$1" >> "$REPORT_FILE"
}

detect_compose_driver() {
  if docker compose version >/dev/null 2>&1; then
    COMPOSE_DRIVER="docker_compose"
    return 0
  fi
  if command -v docker-compose >/dev/null 2>&1; then
    COMPOSE_DRIVER="docker-compose"
    return 0
  fi
  return 1
}

compose_cmd() {
  if [[ "$COMPOSE_DRIVER" == "docker_compose" ]]; then
    docker compose -f "$COMPOSE_FILE" "$@"
    return
  fi
  if [[ "$COMPOSE_DRIVER" == "docker-compose" ]]; then
    docker-compose -f "$COMPOSE_FILE" "$@"
    return
  fi
  echo "Compose driver not detected"
  return 1
}

run_step() {
  local label="$1"
  shift
  CURRENT_STEP="$label"
  echo "==> $label"
  append_report "- [ ] $label"
  if "$@"; then
    append_report "  - status: PASS"
    append_report "  - completed_at_utc: $(timestamp_utc)"
    return 0
  fi
  append_report "  - status: FAIL"
  append_report "  - failed_at_utc: $(timestamp_utc)"
  return 1
}

append_failure_diagnostics() {
  append_report ""
  append_report "## Failure Diagnostics"
  append_report "- failed_step: ${CURRENT_STEP:-unknown}"
  append_report "- failed_at_utc: $(timestamp_utc)"
  append_report ""
  append_report "### docker compose ps"
  append_report '```text'
  compose_cmd ps >> "$REPORT_FILE" 2>&1 || true
  append_report '```'

  if [[ "$STACK_STARTED" -eq 1 ]]; then
    append_report ""
    append_report "### api logs (tail 120)"
    append_report '```text'
    compose_cmd logs api --tail=120 >> "$REPORT_FILE" 2>&1 || true
    append_report '```'

    append_report ""
    append_report "### calc logs (tail 120)"
    append_report '```text'
    compose_cmd logs calc --tail=120 >> "$REPORT_FILE" 2>&1 || true
    append_report '```'

    append_report ""
    append_report "### postgres logs (tail 120)"
    append_report '```text'
    compose_cmd logs postgres --tail=120 >> "$REPORT_FILE" 2>&1 || true
    append_report '```'
  fi
}

on_error() {
  append_failure_diagnostics
}

cat > "$REPORT_FILE" <<EOF
# BERSn Full Smoke Evidence (Latest)

- generated_at_utc: $(timestamp_utc)
- runner: tools/scripts/run_full_smoke_suite.sh

## Steps
EOF

trap on_error ERR

if ! docker info >/dev/null 2>&1; then
  append_report "- [x] Docker daemon availability"
  append_report "  - status: FAIL"
  append_report "  - reason: Docker daemon is not running"
  echo "Docker daemon is not running. Start Docker Desktop first."
  echo "Evidence file: $REPORT_FILE"
  exit 1
fi

cat > "$ENV_FILE" <<'EOF'
ENV=local
POSTGRES_DB=bersn
POSTGRES_USER=bersn
POSTGRES_PASSWORD=bersn
POSTGRES_PORT=5433
REDIS_PORT=6380
API_PORT=8080
CALC_PORT=8000
UI_PORT=5173
EOF

cleanup() {
  compose_cmd down -v --remove-orphans >/dev/null 2>&1 || true
}
trap cleanup EXIT

if ! detect_compose_driver; then
  append_report "- [x] Docker Compose availability"
  append_report "  - status: FAIL"
  append_report "  - reason: neither 'docker compose' nor 'docker-compose' is available"
  echo "Docker Compose is not available in this runner."
  echo "Evidence file: $REPORT_FILE"
  exit 1
fi

run_step "Build and start stack" compose_cmd up -d --build postgres redis calc api
STACK_STARTED=1

run_step "Wait calc ready" bash -lc '
for i in {1..60}; do
  if curl -fsS http://localhost:8000/ready >/dev/null; then
    exit 0
  fi
  sleep 2
done
exit 1
'

run_step "Wait api ready" bash -lc '
for i in {1..60}; do
  if curl -fsS http://localhost:8080/ready >/dev/null; then
    exit 0
  fi
  sleep 2
done
exit 1
'

run_step "Smoke - Error Envelope" compose_cmd exec -T api npm run test:smoke:error-envelope
run_step "Smoke - Runtime/RateLimit" compose_cmd exec -T api npm run test:smoke:runtime
run_step "Smoke - Calc Transport" compose_cmd exec -T api npm run test:smoke:calc-transport
run_step "Smoke - OpenAPI Runtime Contract" compose_cmd exec -T api npm run test:smoke:contract-runtime
run_step "Smoke - Validation Profiles" compose_cmd exec -T api npm run test:smoke:validation-profiles
run_step "Smoke - Golden Path" compose_cmd exec -T api npm run test:smoke:golden-path
run_step "Smoke - Branch Coverage" compose_cmd exec -T api npm run test:smoke:branch-coverage
run_step "Smoke - Persistence" compose_cmd exec -T api npm run test:smoke:persistence

run_step "API performance gate" compose_cmd exec -T api env \
  API_BASE_URL=http://localhost:8081 \
  BENCH_ENDPOINT=/ready \
  BENCH_METHOD=GET \
  BENCH_TOTAL_REQUESTS=200 \
  BENCH_CONCURRENCY=20 \
  BENCH_MIN_SUCCESS_RATE_PCT=100 \
  BENCH_MAX_P95_MS=300 \
  BENCH_MAX_P99_MS=600 \
  BENCH_MIN_THROUGHPUT_RPS=20 \
  npm run bench:api

append_report ""
append_report "## Final Result"
append_report "- status: PASS"
append_report "- completed_at_utc: $(timestamp_utc)"

echo "Full smoke suite passed."
echo "Evidence file: $REPORT_FILE"
