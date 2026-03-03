# BERSn API Contract (Frozen v1.0)

## Scope
This is the frozen backend contract for BERSn sections `3-1` through `3-9`.

- API service base: `http://localhost:8081/api`
- Calc service base: `http://localhost:8000`
- Formula version: `v1.0`

## Standard Request Shape
All formula endpoints use:

```json
{
  "project_id": "uuid-when-using-api-proxy",
  "calc_run_id": "uuid-or-test-id",
  "formula_version": "v1.0",
  "inputs": {}
}
```

Notes:
- `project_id` is required for API proxy endpoints (`/api/bersn/formulas/...`) because step results are stored in DB.
- `project_id` is not required for direct calc endpoints (`/calc/bersn/formulas/...`).

## Standard Success Response Shape (Calc)

```json
{
  "calc_run_id": "string",
  "formula_version": "v1.0",
  "outputs": {},
  "trace": {
    "formulas_used": [],
    "steps": [],
    "engine_version": "BERSn-2024-v1"
  }
}
```

## Standard Success Response Shape (API Proxy)

```json
{
  "ok": true,
  "...existing_fields": "preserved"
}
```

Notes:
- API proxy now prepends `ok: true` to successful responses while preserving existing payload fields.
- This is intentionally non-breaking for consumers already reading legacy fields.

## Standard Error Response Shape

### Calc (`422/500` standardized)
```json
{
  "ok": false,
  "error_code": "BERSN_INPUT_VALIDATION_ERROR",
  "message": "Missing required inputs: AF",
  "details": null
}
```

### Calc error codes
- `BERSN_REQUEST_VALIDATION_ERROR`
  - FastAPI/Pydantic request-shape errors (missing body, wrong root type, etc.).
- `BERSN_INPUT_VALIDATION_ERROR`
  - Domain/input validation errors from formula logic (missing required inputs, range violations, enum mismatch, etc.).
- `BERSN_NOT_FOUND`
  - Explicit 404 errors (when applicable).
- `BERSN_HTTP_ERROR`
  - Other explicit HTTP errors raised by handlers.
- `BERSN_INTERNAL_ERROR`
  - Unhandled server exceptions (500; internal details are not leaked).

### API Proxy (`/api/bersn/...`) standardized
```json
{
  "ok": false,
  "error_code": "CALC_ENGINE_VALIDATION_ERROR",
  "message": "Calc engine request failed.",
  "details": {
    "request_id": "uuid",
    "calc_status": 422,
    "calc_response": {
      "ok": false,
      "error_code": "BERSN_INPUT_VALIDATION_ERROR",
      "message": "...",
      "details": {
        "request_id": "uuid"
      }
    }
  }
}
```

### API Proxy local validation/internal errors
```json
{
  "ok": false,
  "error_code": "BERSN_API_VALIDATION_ERROR",
  "message": "Missing required fields: ...",
  "details": {
    "request_id": "uuid"
  }
}
```

```json
{
  "ok": false,
  "error_code": "BERSN_API_INTERNAL_ERROR",
  "message": "Internal server error.",
  "details": {
    "request_id": "uuid",
    "reason": "..."
  }
}
```

## Endpoint Inventory (Frozen)

### Classification / Run
- `POST /api/bersn/classification/normalize`
- `POST /api/bersn/calc`
- `GET /api/bersn/runs/:calc_run_id`

### Formula Endpoints (API proxy)
- `POST /api/bersn/formulas/afe`
- `POST /api/bersn/formulas/eteui`
- `POST /api/bersn/formulas/weights`
- `POST /api/bersn/formulas/eev`
- `POST /api/bersn/formulas/eac`
- `POST /api/bersn/formulas/el`
- `POST /api/bersn/formulas/preprocess-efficiency`
- `POST /api/bersn/formulas/eei-general`
- `POST /api/bersn/formulas/general-eei`
- `POST /api/bersn/formulas/score-general`
- `POST /api/bersn/formulas/scale-values-general`
- `POST /api/bersn/formulas/indicators-general`
- `POST /api/bersn/formulas/grade-general`
- `POST /api/bersn/formulas/general-full`
- `POST /api/bersn/formulas/hotwater-preprocess`
- `POST /api/bersn/formulas/hotwater-full`
- `POST /api/bersn/formulas/renewable-preprocess`
- `POST /api/bersn/formulas/renewable-bonus`
- `POST /api/bersn/formulas/nzb-eligibility`
- `POST /api/bersn/formulas/nzb-balance`
- `POST /api/bersn/formulas/nzb-evaluate`

### Formula Endpoints (direct calc)
- Same route names under `/calc/bersn/formulas/...` (without `/api` and without DB requirements).

## Validation Rules (Frozen)

1. Numeric constraints:
- area and floor metrics (`AF`, `AFe`) must be `> 0`.
- efficiency and coefficient inputs are `>= 0` where applicable.
- `beta1`, `CFn` must be `> 0`.
- `UR` must be within `[0, 1]`.
- `a`, `b`, `c` for `/eei-general` must each be within `[0,1]` and satisfy `a+b+c = 1.0 (±1e-4)`.

2. Arrays:
- `elevators` must be an array.
- each elevator row must include numeric `Nej`, `Eelj`, `YOHj` and each must be `>= 0`.
- `excluded_zones` must be an array if provided.
- each `excluded_zones` row must include:
  - `type` (non-empty string)
  - `area_m2` (numeric, `>=0`)

3. Missing required fields:
- return `422` with consistent message:
  - `Missing required inputs: field1, field2, ...`

4. Request metadata:
- `calc_run_id` must be non-empty.
- `formula_version` must be `v1.0`.
- `inputs` must be a JSON object.

5. Renewable (`3-8`):
- `pv_area_method`: enforce `Rs_used = min(Rs, 1.0)`.
- `generation_method`: enforce score cap `SCOREEE_after <= 1.1 * SCOREEE_before`.

6. NZB (`3-9`):
- grade gate: only `1+` is eligible.
- balance: `TE = TEUI * AFe`, pass when `TGE >= TE`.
- final pass requires both grade gate and balance pass.

## Trace Expectations
- `trace.formulas_used` must include explicit equation tags used by the endpoint.
- `trace.steps` must include inputs and result snapshots for audit.

## Versioning Policy
- This contract is frozen at `v1.0`.
- Any payload/response breaking change requires a new contract file (`v1.1` or `v2.0`) and route/version negotiation plan.
