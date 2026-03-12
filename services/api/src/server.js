import express from 'express';
import crypto from 'crypto';

// Import the shared database pool for the health check
import pool from './db.js';

// Import the router which defines API endpoints
import calcRoutes from './routes/calcRoutes.js';

const app = express();
const RATE_LIMIT_WINDOW_MS = Number(process.env.API_RATE_LIMIT_WINDOW_MS || 60000);
const RATE_LIMIT_MAX = Number(process.env.API_RATE_LIMIT_MAX || 120);
const RATE_LIMIT_MAX_BUCKETS = Number(process.env.API_RATE_LIMIT_MAX_BUCKETS || 20000);
const READY_CALC_TIMEOUT_MS = Number(process.env.READY_CALC_TIMEOUT_MS || 3000);
const CALC_URL = process.env.CALC_URL || 'http://bersn_calc:8000';
const rateLimitBuckets = new Map();
let lastRateLimitCleanupAt = 0;
const DEFAULT_ALLOWED_ORIGINS = [
  // 'http://localhost:5173',
  // 'http://localhost:8080',
  // 'http://localhost:8081',
  'https://calengine-ui.zeabur.app',
];
const configuredAllowedOrigins = String(process.env.API_ALLOWED_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedOrigins = new Set([...DEFAULT_ALLOWED_ORIGINS, ...configuredAllowedOrigins]);

function isAllowedCorsOrigin(origin) {
  if (!origin) {
    return true;
  }
  if (allowedOrigins.has(origin)) {
    return true;
  }
  try {
    const parsed = new URL(origin);
    if (parsed.protocol === 'https:' && parsed.hostname.endsWith('.zeabur.app')) {
      return true;
    }
  } catch (_error) {
    return false;
  }
  return false;
}

// Parse JSON requests and cap payload size to avoid unbounded body growth.
app.use(express.json({ limit: '2mb' }));
app.use((req, res, next) => {
  const requestOrigin = req.headers.origin;
  if (requestOrigin && isAllowedCorsOrigin(requestOrigin)) {
    res.setHeader('Access-Control-Allow-Origin', requestOrigin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization,X-Request-Id');
  }

  if (req.method === 'OPTIONS') {
    if (requestOrigin && !isAllowedCorsOrigin(requestOrigin)) {
      return res.status(403).json({
        ok: false,
        error_code: 'BERSN_API_CORS_BLOCKED',
        message: `CORS blocked for origin: ${requestOrigin}`,
      });
    }
    return res.status(204).end();
  }

  return next();
});

// Request-id propagation + minimal access logs for auditability.
app.use((req, res, next) => {
  const requestId = req.headers['x-request-id'] || crypto.randomUUID();
  req.requestId = String(requestId);
  res.setHeader('x-request-id', req.requestId);
  const startedNs = process.hrtime.bigint();
  res.on('finish', () => {
    const elapsedMs = Number(process.hrtime.bigint() - startedNs) / 1_000_000;
    console.log('[API request]', {
      request_id: req.requestId,
      method: req.method,
      path: req.originalUrl,
      status_code: res.statusCode,
      elapsed_ms: Number(elapsedMs.toFixed(3)),
    });
  });
  next();
});

// Basic in-memory rate limit for /api endpoints.
// This is process-local and intended as a safe baseline for service hardening.
app.use('/api', (req, res, next) => {
  const now = Date.now();
  // Periodically prune expired buckets so cardinality does not grow forever.
  if (now - lastRateLimitCleanupAt > RATE_LIMIT_WINDOW_MS || rateLimitBuckets.size > RATE_LIMIT_MAX_BUCKETS) {
    for (const [bucketKey, bucketVal] of rateLimitBuckets.entries()) {
      if (now >= bucketVal.resetAt) {
        rateLimitBuckets.delete(bucketKey);
      }
    }
    lastRateLimitCleanupAt = now;
  }
  const key = `${req.ip || 'unknown'}:${req.path}`;
  const existing = rateLimitBuckets.get(key);

  let bucket = existing;
  if (!bucket || now >= bucket.resetAt) {
    bucket = {
      count: 0,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    };
  }

  bucket.count += 1;
  rateLimitBuckets.set(key, bucket);

  const remaining = Math.max(0, RATE_LIMIT_MAX - bucket.count);
  res.setHeader('x-ratelimit-limit', String(RATE_LIMIT_MAX));
  res.setHeader('x-ratelimit-remaining', String(remaining));
  res.setHeader('x-ratelimit-reset', String(bucket.resetAt));

  if (bucket.count > RATE_LIMIT_MAX) {
    return res.status(429).json({
      ok: false,
      error_code: 'BERSN_API_RATE_LIMITED',
      message: 'Rate limit exceeded for this endpoint.',
      details: {
        request_id: req.requestId,
        limit: RATE_LIMIT_MAX,
        window_ms: RATE_LIMIT_WINDOW_MS,
        reset_at: bucket.resetAt,
      },
    });
  }

  return next();
});

// Health check route uses the shared pool to verify connectivity
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1;');
    res.json({ status: 'ok' });
  } catch (e) {
    res.status(500).json({ status: 'fail', error: String(e.message || e) });
  }
});

// Readiness checks both DB and calc service.
app.get('/ready', async (req, res) => {
  try {
    await pool.query('SELECT 1;');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), READY_CALC_TIMEOUT_MS);
    let calcResp;
    try {
      calcResp = await fetch(`${CALC_URL}/ready`, {
        headers: { 'x-request-id': req.requestId },
        signal: controller.signal,
      });
    } catch (e) {
      clearTimeout(timeout);
      if (e?.name === 'AbortError') {
        return res.status(503).json({
          status: 'not_ready',
          request_id: req.requestId,
          checks: { database: 'ok', calc: 'timeout' },
          error: `calc readiness timeout after ${READY_CALC_TIMEOUT_MS}ms`,
        });
      }
      throw e;
    } finally {
      clearTimeout(timeout);
    }

    if (!calcResp.ok) {
      return res.status(503).json({
        status: 'not_ready',
        request_id: req.requestId,
        checks: { database: 'ok', calc: `fail_${calcResp.status}` },
      });
    }
    return res.json({
      status: 'ready',
      request_id: req.requestId,
      checks: { database: 'ok', calc: 'ok' },
    });
  } catch (e) {
    return res.status(503).json({
      status: 'not_ready',
      request_id: req.requestId,
      error: String(e.message || e),
    });
  }
});

// Mount API routes under /api
app.use('/api', calcRoutes);

const PORT = process.env.API_PORT ? Number(process.env.API_PORT) : 8080;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`BERSn API listening on ${PORT}`);
});
