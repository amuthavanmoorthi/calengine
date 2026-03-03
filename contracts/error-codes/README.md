# BERSn Error Code Registry

- Source of truth: `bersn-error-codes-v1.0.json`
- Purpose: keep API/calc/openapi error codes consistent and auditable.

## Validation

Run from repo root:

```bash
npm run check:error-codes
```

This check fails when:
- a code appears in API/calc/openapi files but is not in the registry.
- a registry code is never referenced in API/calc/openapi files.
