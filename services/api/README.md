Node.js API (orchestrator).

## Phase 1 Auth

- `POST /api/auth/login`
- Demo credentials seeded by migration:
  - username: `agency_test`
  - password: `phase1_demo`
- Login attempts are persisted in `auth_login_events`.

## Performance Hardening

- DB pool is now tunable via env:
  - `DB_POOL_MAX` (default `20`)
  - `DB_IDLE_TIMEOUT_MS` (default `30000`)
  - `DB_CONNECTION_TIMEOUT_MS` (default `5000`)
  - `DB_STATEMENT_TIMEOUT_MS` (default `15000`)
  - `DB_QUERY_TIMEOUT_MS` (default `20000`)
- Rate limiter now prunes expired buckets to avoid unbounded memory growth.
- Readiness check now has bounded calc dependency timeout:
  - `READY_CALC_TIMEOUT_MS` (default `3000`)

## Benchmark

Run a quick latency/throughput benchmark:

```bash
npm run bench:api
```

## Smoke Tests

- `npm run test:smoke:error-envelope`
- `npm run test:smoke:runtime`
- `npm run test:smoke:calc-transport` (asserts `CALC_ENGINE_TIMEOUT`/`CALC_ENGINE_UNAVAILABLE` mapping)
- `npm run test:smoke:contract-runtime` (success-shape checks against OpenAPI-critical fields)
- `npm run test:smoke:validation-profiles` (negative matrix for endpoint-specific input profiles)
- `npm run test:smoke:golden-path` (deterministic numeric checks for representative formulas)
- `npm run test:smoke:branch-coverage` (hot-water full, renewable preprocess/bonus, NZB evaluate)
- `npm run test:smoke:persistence` (DB step persistence + run-details readback)

Optional env:

```bash
API_BASE_URL=http://localhost:8080 \
BENCH_ENDPOINT=/api/bersn/classification/normalize \
BENCH_METHOD=POST \
BENCH_TOTAL_REQUESTS=200 \
BENCH_CONCURRENCY=20 \
BENCH_BODY_JSON='{"total_above_ground_floor_area_m2":12000,"segments":[{"appendix1_code":"G2","table_3_2_label":"G-2 辦公場所","display_name":"Office","area_m2":9000,"operation_mode":"all_year","urban_zone":"A"}]}' \
npm run bench:api
```

Threshold gates (non-zero exit when violated):

```bash
API_BASE_URL=http://localhost:8080 \
BENCH_ENDPOINT=/ready \
BENCH_METHOD=GET \
BENCH_TOTAL_REQUESTS=200 \
BENCH_CONCURRENCY=20 \
BENCH_MIN_SUCCESS_RATE_PCT=100 \
BENCH_MAX_P95_MS=300 \
BENCH_MAX_P99_MS=600 \
BENCH_MIN_THROUGHPUT_RPS=20 \
npm run bench:api
```
