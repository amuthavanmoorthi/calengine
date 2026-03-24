import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

import pg from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const {
  DB_HOST = 'postgres',
  DB_PORT = '5432',
  DB_NAME = 'bersn',
  DB_USER = 'bersn',
  DB_PASSWORD = 'bersn',
  DB_POOL_MAX = '20',
  DB_IDLE_TIMEOUT_MS = '30000',
  DB_CONNECTION_TIMEOUT_MS = '5000',
  DB_STATEMENT_TIMEOUT_MS = '15000',
  DB_QUERY_TIMEOUT_MS = '20000',
  MIGRATIONS_DIR,
} = process.env;

const MIGRATIONS_TABLE = 'schema_migrations';
const SQL_FILE_PATTERN = /^\d+.*\.sql$/i;
const DEFAULT_MIGRATION_DIRS = [
  path.resolve(__dirname, '../../../../database/migrations/postgres'),
  '/migrations',
  '/docker-entrypoint-initdb.d',
];

const pool = new pg.Pool({
  host: DB_HOST,
  port: Number(DB_PORT),
  database: DB_NAME,
  user: DB_USER,
  password: DB_PASSWORD,
  max: Number(DB_POOL_MAX),
  idleTimeoutMillis: Number(DB_IDLE_TIMEOUT_MS),
  connectionTimeoutMillis: Number(DB_CONNECTION_TIMEOUT_MS),
  statement_timeout: Number(DB_STATEMENT_TIMEOUT_MS),
  query_timeout: Number(DB_QUERY_TIMEOUT_MS),
});

function sha256(text) {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

async function ensureMigrationsTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
      filename TEXT PRIMARY KEY,
      checksum TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
}

async function listMigrationFiles() {
  const migrationsDir = await resolveMigrationsDir();
  const entries = await fs.readdir(migrationsDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && SQL_FILE_PATTERN.test(entry.name))
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b));
}

async function resolveMigrationsDir() {
  const candidates = MIGRATIONS_DIR
    ? [MIGRATIONS_DIR]
    : DEFAULT_MIGRATION_DIRS;

  for (const candidate of candidates) {
    try {
      const stat = await fs.stat(candidate);
      if (stat.isDirectory()) {
        return candidate;
      }
    } catch {
      // continue to next candidate
    }
  }

  throw new Error(
    `No migrations directory found. Checked: ${candidates.join(', ')}`,
  );
}

async function loadAppliedMigrations(client) {
  const { rows } = await client.query(
    `SELECT filename, checksum, applied_at FROM ${MIGRATIONS_TABLE} ORDER BY filename ASC`,
  );
  return new Map(rows.map((row) => [row.filename, row]));
}

async function readMigration(name) {
  const migrationsDir = await resolveMigrationsDir();
  const filePath = path.join(migrationsDir, name);
  const sql = await fs.readFile(filePath, 'utf8');
  return {
    name,
    filePath,
    sql,
    checksum: sha256(sql),
  };
}

async function printStatus(client) {
  const files = await listMigrationFiles();
  const applied = await loadAppliedMigrations(client);

  for (const name of files) {
    const migration = await readMigration(name);
    const row = applied.get(name);
    if (!row) {
      console.log(`PENDING  ${name}`);
      continue;
    }
    if (row.checksum !== migration.checksum) {
      console.log(`MISMATCH ${name}`);
      continue;
    }
    console.log(`APPLIED  ${name}  ${row.applied_at.toISOString()}`);
  }
}

async function applyMigrations(client) {
  const files = await listMigrationFiles();
  const applied = await loadAppliedMigrations(client);

  let appliedCount = 0;
  for (const name of files) {
    const migration = await readMigration(name);
    const existing = applied.get(name);

    if (existing) {
      if (existing.checksum !== migration.checksum) {
        throw new Error(
          `Migration checksum mismatch for ${name}. Applied checksum ${existing.checksum} does not match current checksum ${migration.checksum}.`,
        );
      }
      console.log(`Skipping already applied migration ${name}`);
      continue;
    }

    console.log(`Applying migration ${name}`);
    await client.query('BEGIN');
    try {
      await client.query(migration.sql);
      await client.query(
        `INSERT INTO ${MIGRATIONS_TABLE} (filename, checksum) VALUES ($1, $2)`,
        [migration.name, migration.checksum],
      );
      await client.query('COMMIT');
      appliedCount += 1;
    } catch (error) {
      await client.query('ROLLBACK');
      throw new Error(`Failed applying migration ${name}: ${error.message}`);
    }
  }

  console.log(`Migration run complete. Applied ${appliedCount} new migration(s).`);
}

async function main() {
  const mode = process.argv[2] === 'status' ? 'status' : 'up';
  const client = await pool.connect();

  try {
    await ensureMigrationsTable(client);
    if (mode === 'status') {
      await printStatus(client);
      return;
    }
    await applyMigrations(client);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(`db:migrate failed: ${error.message}`);
  process.exitCode = 1;
});
