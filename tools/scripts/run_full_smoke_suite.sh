#!/usr/bin/env bash
set -Eeuo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
COMPOSE_FILE="$REPO_ROOT/infra/docker/docker-compose.yml"
ENV_FILE="$REPO_ROOT/infra/docker/.env"
REPORT_DIR="$REPO_ROOT/docs/runbooks"
REPORT_FILE="$REPORT_DIR/BERSN_SMOKE_EVIDENCE_latest.md"
STACK_STARTED=0
CURRENT_STEP=""

mkdir -p "$REPORT_DIR"

timestamp_utc() {
  date -u +"%Y-%m-%dT%H:%M:%SZ"
}

append_report() {
  printf "%s\n" "$1" >> "$REPORT_FILE"
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
  docker compose -f "$COMPOSE_FILE" ps >> "$REPORT_FILE" 2>&1 || true
  append_report '```'

  if [[ "$STACK_STARTED" -eq 1 ]]; then
    append_report ""
    append_report "### api logs (tail 120)"
    append_report '```text'
    docker compose -f "$COMPOSE_FILE" logs api --tail=120 >> "$REPORT_FILE" 2>&1 || true
    append_report '```'

    append_report ""
    append_report "### calc logs (tail 120)"
    append_report '```text'
    docker compose -f "$COMPOSE_FILE" logs calc --tail=120 >> "$REPORT_FILE" 2>&1 || true
    append_report '```'

    append_report ""
    append_report "### postgres logs (tail 120)"
    append_report '```text'
    docker compose -f "$COMPOSE_FILE" logs postgres --tail=120 >> "$REPORT_FILE" 2>&1 || true
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
  docker compose -f "$COMPOSE_FILE" down -v --remove-orphans >/dev/null 2>&1 || true
}
trap cleanup EXIT

run_step "Build and start stack" docker compose -f "$COMPOSE_FILE" up -d --build postgres redis calc api
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

run_step "Smoke - Error Envelope" docker compose -f "$COMPOSE_FILE" exec -T api npm run test:smoke:error-envelope
run_step "Smoke - Runtime/RateLimit" docker compose -f "$COMPOSE_FILE" exec -T api npm run test:smoke:runtime
run_step "Smoke - Calc Transport" docker compose -f "$COMPOSE_FILE" exec -T api npm run test:smoke:calc-transport
run_step "Smoke - OpenAPI Runtime Contract" docker compose -f "$COMPOSE_FILE" exec -T api npm run test:smoke:contract-runtime
run_step "Smoke - Validation Profiles" docker compose -f "$COMPOSE_FILE" exec -T api npm run test:smoke:validation-profiles
run_step "Smoke - Golden Path" docker compose -f "$COMPOSE_FILE" exec -T api npm run test:smoke:golden-path
run_step "Smoke - Branch Coverage" docker compose -f "$COMPOSE_FILE" exec -T api npm run test:smoke:branch-coverage
run_step "Smoke - Persistence" docker compose -f "$COMPOSE_FILE" exec -T api npm run test:smoke:persistence

run_step "API performance gate" docker compose -f "$COMPOSE_FILE" exec -T api env \
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
