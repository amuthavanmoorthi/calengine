import crypto from 'crypto';
import { pool } from '../models/calcModel.js';
import { findActiveUserByCredentials, insertLoginEvent } from '../models/authModel.js';

const PHASE1_DEMO_USERNAME = process.env.PHASE1_DEMO_USERNAME || 'agency_test';
const PHASE1_DEMO_PASSWORD = process.env.PHASE1_DEMO_PASSWORD || 'phase1_demo';
const PHASE1_DEMO_ROLE = process.env.PHASE1_DEMO_ROLE || 'reviewer';
const PHASE1_DEMO_USER_ID = process.env.PHASE1_DEMO_USER_ID || '11111111-1111-4111-8111-111111111111';

function buildPhase1DemoUser() {
  return {
    id: PHASE1_DEMO_USER_ID,
    username: PHASE1_DEMO_USERNAME,
    role: PHASE1_DEMO_ROLE,
  };
}

function isPhase1DemoCredential(username, password) {
  return username === PHASE1_DEMO_USERNAME && password === PHASE1_DEMO_PASSWORD;
}

function buildSuccessResponse(res, user) {
  return res.status(200).json({
    ok: true,
    session_id: crypto.randomUUID(),
    user: {
      id: user.id,
      username: user.username,
      role: user.role,
    },
  });
}

async function rollbackQuietly(client) {
  try {
    await client.query('ROLLBACK');
  } catch (_) {}
}

async function resetClientSession(client) {
  await rollbackQuietly(client);
}

export async function loginPhase1(req, res) {
  const { username, password } = req.body || {};
  if (
    typeof username !== 'string'
    || username.trim().length === 0
    || typeof password !== 'string'
    || password.length === 0
  ) {
    return res.status(400).json({
      ok: false,
      error_code: 'BERSN_API_VALIDATION_ERROR',
      message: 'username and password are required',
      details: { request_id: req.requestId },
    });
  }

  const normalizedUsername = username.trim();
  const baseEvent = {
    username: normalizedUsername,
    request_id: req.requestId,
    ip_address: req.ip || null,
    user_agent: req.headers['user-agent'] || null,
  };

  // Phase 1 requires a stable demo account. Keep login available even when the
  // deployment DB is missing auth tables or event logging is unavailable.
  if (isPhase1DemoCredential(normalizedUsername, password)) {
    const demoUser = buildPhase1DemoUser();
    let client = null;
    try {
      client = await pool.connect();
      await resetClientSession(client);
      await client.query('BEGIN');
      const dbUser = await findActiveUserByCredentials(client, normalizedUsername, password);
      await insertLoginEvent(client, {
        ...baseEvent,
        user_id: dbUser?.id || demoUser.id,
        success: true,
      });
      await client.query('COMMIT');
      return buildSuccessResponse(res, dbUser || demoUser);
    } catch (_error) {
      if (client) {
        await rollbackQuietly(client);
      }
      return buildSuccessResponse(res, demoUser);
    } finally {
      client?.release();
    }
  }

  const client = await pool.connect();
  try {
    await resetClientSession(client);
    await client.query('BEGIN');

    const user = await findActiveUserByCredentials(client, normalizedUsername, password);

    if (!user) {
      await insertLoginEvent(client, {
        ...baseEvent,
        user_id: null,
        success: false,
      });
      await client.query('COMMIT');
      return res.status(401).json({
        ok: false,
        error_code: 'BERSN_AUTH_INVALID_CREDENTIALS',
        message: 'Invalid username or password',
        details: { request_id: req.requestId },
      });
    }

    await insertLoginEvent(client, {
      ...baseEvent,
      user_id: user.id,
      success: true,
    });

    await client.query('COMMIT');

    return res.status(200).json({
      ok: true,
      session_id: crypto.randomUUID(),
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    });
  } catch (e) {
    await rollbackQuietly(client);
    return res.status(500).json({
      ok: false,
      error_code: 'BERSN_API_INTERNAL_ERROR',
      message: 'Internal server error.',
      details: {
        request_id: req.requestId,
        reason: String(e.message || e),
      },
    });
  } finally {
    client.release();
  }
}
