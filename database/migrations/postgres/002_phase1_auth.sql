CREATE TABLE IF NOT EXISTS app_users (
  id UUID PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_plain TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'reviewer',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS auth_login_events (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES app_users(id),
  username TEXT NOT NULL,
  success BOOLEAN NOT NULL,
  request_id TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO app_users (id, username, password_plain, role, is_active)
VALUES (
  '11111111-1111-4111-8111-111111111111',
  'agency_test',
  'phase1_demo',
  'reviewer',
  TRUE
)
ON CONFLICT (username) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_auth_login_events_created_at ON auth_login_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_auth_login_events_username ON auth_login_events(username);
