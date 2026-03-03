Dev scripts (format/lint/test/generation).

- `generate_postman_from_openapi.mjs`
  - Source: `contracts/openapi/bersn-api-v1.0.yaml`
  - Output: `contracts/postman/BERSn_API_v1.0.postman_collection.json`
- `check_contract_sync.mjs`
  - Verifies router routes are present in OpenAPI.
  - Verifies OpenAPI endpoints are present in generated Postman collection.
  - Also enforces `/health` and `/ready` presence in OpenAPI.
- `check_openapi_structure.mjs`
  - Verifies OpenAPI files contain required top-level keys.
  - Verifies each path has at least one operation and each operation has `responses`.
- `check_error_codes_registry.mjs`
  - Verifies all used error codes are registered in `contracts/error-codes`.
  - Verifies registry entries are not stale/unused.
- `run_full_smoke_suite.sh`
  - Runs the same API smoke sequence used in CI against local Docker stack.
  - Generates evidence report at `docs/runbooks/BERSN_SMOKE_EVIDENCE_latest.md`.
  - On failure, appends diagnostics (docker compose status + API/calc/postgres log tails) to the same evidence report.
