-- BERSn: Versioned Inputs (immutable snapshots)
CREATE TABLE IF NOT EXISTS bersn_input_versions (
  id UUID PRIMARY KEY,
  project_id UUID NOT NULL,
  branch_type TEXT NOT NULL CHECK (branch_type IN ('WITH_HOT_WATER', 'WITHOUT_HOT_WATER')),
  formula_version TEXT NOT NULL,
  payload_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- BERSn: Calculation Runs (one run per input snapshot)
CREATE TABLE IF NOT EXISTS calc_runs (
  id UUID PRIMARY KEY,
  input_version_id UUID NOT NULL REFERENCES bersn_input_versions(id),
  inputs_hash TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED')),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- BERSn: Calculation Results (full artifact)
CREATE TABLE IF NOT EXISTS calc_results (
  calc_run_id UUID PRIMARY KEY REFERENCES calc_runs(id),
  result_json JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Helpful indexes (audit + query speed)
CREATE INDEX IF NOT EXISTS idx_bersn_input_versions_project_id ON bersn_input_versions(project_id);
CREATE INDEX IF NOT EXISTS idx_calc_runs_input_version_id ON calc_runs(input_version_id);
