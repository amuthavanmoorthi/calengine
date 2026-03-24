CREATE TABLE IF NOT EXISTS system_parameters (
  key TEXT PRIMARY KEY,
  numeric_value DOUBLE PRECISION NOT NULL,
  unit TEXT NOT NULL,
  source_authority TEXT,
  source_url TEXT,
  source_note TEXT,
  effective_year INTEGER,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'PENDING', 'ARCHIVED')),
  auto_managed BOOLEAN NOT NULL DEFAULT TRUE,
  last_verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS system_parameter_history (
  id UUID PRIMARY KEY,
  key TEXT NOT NULL,
  old_numeric_value DOUBLE PRECISION,
  new_numeric_value DOUBLE PRECISION NOT NULL,
  unit TEXT NOT NULL,
  source_authority TEXT,
  source_url TEXT,
  source_note TEXT,
  effective_year INTEGER,
  change_reason TEXT NOT NULL,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_system_parameter_history_key_changed_at
  ON system_parameter_history(key, changed_at DESC);

INSERT INTO system_parameters (
  key,
  numeric_value,
  unit,
  source_authority,
  source_note,
  effective_year,
  status,
  auto_managed
)
VALUES (
  'beta1',
  0.474,
  'kgCO2e/kWh',
  'MOEAEA',
  'Bootstrap beta1 default (113年度電力排碳係數 sample value)',
  113,
  'ACTIVE',
  TRUE
)

ON CONFLICT (key) DO NOTHING;
