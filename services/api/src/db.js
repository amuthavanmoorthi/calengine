/**
 * Shared PostgreSQL pool for the API service.
 *
 * Auditability rationale:
 * - all DB writes/reads go through one pool instance
 * - connection configuration is environment-driven and explicit
 */
import pg from 'pg';

// Extract database configuration from environment variables.
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
} = process.env;

// Initialise a connection pool. The pool can be shared across modules.
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

export default pool;
