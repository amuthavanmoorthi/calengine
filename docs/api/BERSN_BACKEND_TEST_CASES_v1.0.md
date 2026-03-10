# BERSn Backend Test Cases (v1.0)

Date: 2026-03-03

## Objective
Provide a backend test pack for integration and regression, aligned to BERSn sections 3-1 through 3-9.

## Execution Entry Point
- Full suite: `npm run smoke:full`
- Evidence output: `docs/runbooks/BERSN_SMOKE_EVIDENCE_latest.md`
- Phase-1 initial test runner:
  - `cd services/api`
  - `API_BASE_URL=http://localhost:8081 npm run test:phase1:initial`
  - Output:
    - `docs/testing/results/PHASE1_SYSTEM_INITIAL_TEST_RESULTS.latest.json`
    - `docs/testing/results/PHASE1_SYSTEM_INITIAL_TEST_RESULTS.latest.md`

## Test Buckets

### 1) Error Envelope / Validation
- Script: `services/api/src/tests/errorEnvelopeSmoke.mjs`
- Verifies:
  - standardized API error envelope (`ok`, `error_code`, `message`)
  - API validation errors
  - calc validation passthrough (`CALC_ENGINE_VALIDATION_ERROR`, `calc_status=422`, `calc_response.detail`)

### 2) Runtime / Rate Limit
- Script: `services/api/src/tests/readinessRateLimitSmoke.mjs`
- Verifies:
  - `/health` and `/ready`
  - rate-limit headers and behavior on `/api/*`

### 3) Calc Transport Resilience
- Script: `services/api/src/tests/calcTransportSmoke.mjs`
- Verifies:
  - timeout mapping (`504`, `CALC_ENGINE_TIMEOUT`)
  - unreachable mapping (`502`, `CALC_ENGINE_UNAVAILABLE`)

### 4) OpenAPI Runtime Contract
- Script: `services/api/src/tests/openapiRuntimeContractSmoke.mjs`
- Verifies:
  - response shape compatibility for key endpoints

### 5) Formula Input Profiles
- Script: `services/api/src/tests/validationProfilesSmoke.mjs`
- Verifies:
  - endpoint-specific required field guards

### 6) Deterministic Golden Path
- Script: `services/api/src/tests/goldenPathSmoke.mjs`
- Verifies:
  - deterministic outputs for representative 3-1 and general branch flow

### 7) Branch Coverage
- Script: `services/api/src/tests/branchCoverageSmoke.mjs`
- Verifies:
  - hot-water full path
  - renewable preprocess/bonus
  - NZB evaluate

### 8) Persistence / Readback
- Script: `services/api/src/tests/persistenceSmoke.mjs`
- Verifies:
  - DB-backed step persistence
  - run-details readback from `/api/bersn/runs/:calc_run_id`

### 9) Performance Gate
- Script: `services/api/src/tests/perfBenchmark.mjs`
- Gate configured in smoke runner for `/ready`.

### 10) Phase-1 System Initial Test Pack
- Script: `services/api/src/tests/phase1SystemInitialTest.mjs`
- Verifies:
  - General non-residential no-hot-water path
  - Central hot-water path
  - Mixed-use normalization path
  - Boundary logic:
    - 99m² vs 100m² excluded-zone inclusion
    - 4.9% vs 5.0% mixed-use threshold
    - EUI* grade-threshold crossing behavior

## Pass Criteria
- Every smoke script passes in clean Docker environment.
- Performance threshold checks pass.
- Evidence file records final status `PASS`.
