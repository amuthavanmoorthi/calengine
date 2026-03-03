# BERSn Backend Handoff (v1.0)

Date: 2026-03-03

## Backend Handoff Package

### Contracts
- OpenAPI:
  - `contracts/openapi/bersn-api-v1.0.yaml`
  - `contracts/openapi/bersn-calc-v1.0.yaml`
- Postman:
  - `contracts/postman/BERSn_API_v1.0.postman_collection.json`
- Error codes:
  - `contracts/error-codes/bersn-error-codes-v1.0.json`

### Operational Docs
- Acceptance checklist:
  - `docs/api/BERSN_ACCEPTANCE_CHECKLIST_v1.0.md`
- Freeze note:
  - `docs/api/BERSN_BACKEND_FREEZE_v1.0.md`
- Test-case pack:
  - `docs/api/BERSN_BACKEND_TEST_CASES_v1.0.md`
- Smoke evidence:
  - `docs/runbooks/BERSN_SMOKE_EVIDENCE_latest.md`

### Runtime Entrypoints
- API service:
  - `services/api/src/server.js`
- Calc service:
  - `services/calc/app/main.py`

## Frontend Integration Rules
- Integrate strictly against frozen contracts (no payload drift).
- Consume API error envelope fields: `ok`, `error_code`, `message`, `details`.
- Use run-details endpoint for trace/debug views:
  - `GET /api/bersn/runs/:calc_run_id`

## Change Control
- Any backend contract change requires:
  1. OpenAPI update
  2. Postman regeneration
  3. Error code registry update (if applicable)
  4. Smoke suite re-run (`npm run smoke:full`)

