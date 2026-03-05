import crypto from 'crypto';
import { pool } from '../models/calcModel.js';
import { findActiveUserByCredentials, insertLoginEvent } from '../models/authModel.js';

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

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const user = await findActiveUserByCredentials(client, username.trim(), password);
    const baseEvent = {
      username: username.trim(),
      request_id: req.requestId,
      ip_address: req.ip || null,
      user_agent: req.headers['user-agent'] || null,
    };

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
    try {
      await client.query('ROLLBACK');
    } catch (_) {}
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
