Postgres migrations (versioned).

Use the migration runner for existing databases:

- `npm run db:migrate`
- `npm run db:migrate:status`

How it works:

- SQL files in this folder matching `NNN*.sql` are applied in filename order.
- Applied files are recorded in `schema_migrations`.
- If a previously applied file changes, the runner stops on checksum mismatch instead of silently reapplying it.

Why this exists:

- `docker-entrypoint-initdb.d` only runs when Postgres creates a brand-new data directory.
- Existing database volumes do not automatically pick up newly added SQL files.
- The migration runner is the supported way to apply schema changes after initial bootstrap.
