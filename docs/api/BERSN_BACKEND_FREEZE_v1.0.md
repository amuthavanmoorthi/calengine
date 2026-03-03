# BERSn Backend Freeze (v1.0)

Date: 2026-03-03

## Scope Frozen
- API service: `services/api`
- Calc service: `services/calc`
- Contract artifacts:
  - `contracts/openapi/bersn-api-v1.0.yaml`
  - `contracts/openapi/bersn-calc-v1.0.yaml`
  - `contracts/error-codes/bersn-error-codes-v1.0.json`
  - `contracts/postman/BERSn_API_v1.0.postman_collection.json`

## Stability Decision
- Backend payloads, endpoint paths, and error envelope are frozen for frontend integration.
- Any post-freeze change must be versioned and documented in OpenAPI + Postman + error-code registry.

## Fresh Environment Verification (Clean Stack)
- Command used: `npm run smoke:full`
- Evidence file: `docs/runbooks/BERSN_SMOKE_EVIDENCE_latest.md`
- Evidence timestamp:
  - generated_at_utc: `2026-03-03T08:36:42Z`
  - final completed_at_utc: `2026-03-03T08:37:03Z`
- Result: `PASS`

## Acceptance Status
- Acceptance checklist: `docs/api/BERSN_ACCEPTANCE_CHECKLIST_v1.0.md`
- Current status: backend acceptance checks complete for integration handoff.

## Integration Gate
Frontend work should use only the frozen contracts above. If any backend behavior update is required, open a tracked change request before implementation.

