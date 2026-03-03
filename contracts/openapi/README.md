# OpenAPI Contracts

Place OpenAPI source files and generated API specs for external consumers here.

## Current Source
- `bersn-calc-v1.0.yaml`
  - Base calc service contract for v1.0.
  - Includes standardized error schema (`ok`, `error_code`, `message`, `details`).
- `bersn-api-v1.0.yaml`
  - Full Node API gateway contract for v1.0 (`/api/bersn/*`, `/health`, `/ready`).
  - Reflects the standardized API envelopes:
    - success: `ok: true`
    - errors: `ok: false`, `error_code`, `message`, optional `details`.

## Downstream Artifacts
- Postman collection is generated from `bersn-api-v1.0.yaml`:
  - `contracts/postman/BERSn_API_v1.0.postman_collection.json`
  - regenerate via: `npm run generate:postman`
