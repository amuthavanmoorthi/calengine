import crypto from 'crypto';

export async function findActiveUserByCredentials(client, username, password) {
  const { rows } = await client.query(
    `SELECT id, username, role
       FROM app_users
      WHERE username = $1
        AND password_plain = $2
        AND is_active = TRUE
      LIMIT 1`,
    [username, password],
  );
  return rows[0] || null;
}

export async function insertLoginEvent(client, payload) {
  await client.query(
    `INSERT INTO auth_login_events
      (id, user_id, username, success, request_id, ip_address, user_agent)
     VALUES
      ($1, $2, $3, $4, $5, $6, $7)`,
    [
      crypto.randomUUID(),
      payload.user_id || null,
      payload.username,
      Boolean(payload.success),
      payload.request_id || null,
      payload.ip_address || null,
      payload.user_agent || null,
    ],
  );
}
