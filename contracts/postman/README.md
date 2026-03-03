# Postman Collections

## Files
- `BERSn_API_v1.0.postman_collection.json`
  - Generated from `contracts/openapi/bersn-api-v1.0.yaml`.
  - Covers `/health`, `/ready`, and all `/api/bersn/*` routes.

## Regenerate
Run from repository root:

```bash
npm run generate:postman
```

This regenerates the collection and keeps Postman aligned with the OpenAPI contract.
