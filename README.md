# BERSn CalEngine

BERSn platform with:
- `services/ui` (Vue 3 frontend)
- `services/api` (Node.js API + DB persistence)
- `services/calc` (Python/FastAPI formula engine)

## Repository Layout
- `contracts/`: schema and API/event contracts
- `database/`: migrations and seed data
- `docs/`: architecture, API contracts, runbooks
- `infra/`: Docker and deployment infra
- `services/`: app services (`ui`, `api`, `calc`)
- `tools/`: utility scripts

## Run (Docker)
From `infra/docker`:

```bash
docker compose up -d --build
```

## Migrations
Apply versioned Postgres migrations to an existing environment:

```bash
npm run db:migrate
```

Check migration status:

```bash
npm run db:migrate:status
```
