import pool from '../db.js';

/**
 * Insert immutable input snapshot into `bersn_input_versions`.
 *
 * Auditability:
 * - preserves the exact request payload used by a run
 * - ties payload to project/branch/formula_version
 */
export async function insertInputVersion(client, id, projectId, branchType, formulaVersion, payloadJson) {
  await client.query(
    `INSERT INTO bersn_input_versions (id, project_id, branch_type, formula_version, payload_json)
     VALUES ($1, $2, $3, $4, $5)`,
    [id, projectId, branchType, formulaVersion, payloadJson],
  );
}

/**
* Create a calculation run entry in `calc_runs`.
*
* Auditability:
* - run starts in RUNNING state
* - status transitions are recorded with timestamps
 */
export async function createCalcRun(client, id, inputVersionId, inputsHash) {
  await client.query(
    `INSERT INTO calc_runs (id, input_version_id, inputs_hash, status, started_at)
     VALUES ($1, $2, $3, 'RUNNING', now())`,
    [id, inputVersionId, inputsHash],
  );
}

/**
 * Save final run result artifact into `calc_results`.
 */
export async function saveCalcResult(client, calcRunId, resultJson) {
  await client.query(
    `INSERT INTO calc_results (calc_run_id, result_json)
     VALUES ($1, $2)`,
    [calcRunId, resultJson],
  );
}

/**
 * Update run status and optional error message in `calc_runs`.
 */
export async function updateRunStatus(clientOrPool, calcRunId, status, errorMessage = null) {
  await clientOrPool.query(
    `UPDATE calc_runs
       SET status=$2, finished_at=now(), error_message=$3
     WHERE id=$1`,
    [calcRunId, status, errorMessage],
  );
}


export async function getLatestInputVersionByProject(projectId) {
  const { rows } = await pool.query(
    `SELECT *
       FROM bersn_input_versions
      WHERE project_id = $1
      ORDER BY created_at DESC
      LIMIT 1`,
    [projectId],
  );
  return rows[0] || null;
}

// ----------------------------------------------------------------------------------------------------------------
// Formula-step storage helpers.

export async function getRunInputSnapshot(client, calcRunId) {
  const { rows } = await client.query(
    `SELECT
        r.id AS calc_run_id,
        iv.project_id,
        iv.branch_type,
        iv.formula_version,
        iv.payload_json
     FROM calc_runs r
     JOIN bersn_input_versions iv ON iv.id = r.input_version_id
     WHERE r.id = $1
     LIMIT 1`,
    [calcRunId],
  );
  return rows[0] || null;
}

// Save / upsert a single formula step output (AFe, EtEUI, weights, ...)
export async function saveStepResult(client, calcRunId, stepName, resultJson) {
  await client.query(
    `INSERT INTO calc_step_results (calc_run_id, step_name, result_json)
     VALUES ($1, $2, $3)
     ON CONFLICT (calc_run_id, step_name)
     DO UPDATE SET result_json = EXCLUDED.result_json`,
    [calcRunId, stepName, resultJson],
  );
}

// For EtEUI Formula 
export async function getStepResult(client, calcRunId, stepName) {
  const { rows } = await client.query(
    `SELECT result_json
       FROM calc_step_results
      WHERE calc_run_id = $1
        AND step_name = $2
      LIMIT 1`,
    [calcRunId, stepName],
  );
  return rows[0]?.result_json || null;
}


// ----------------------------------------------------------------------------------------------------------------------
// Readback helper used by frontend run-details page.

// Returns snapshot + all step results for a calc_run_id
export async function getRunWithSteps(client, calcRunId) {
  // 1) Snapshot (calc_runs -> bersn_input_versions)
  const snapRes = await client.query(
    `SELECT
        r.id AS calc_run_id,
        iv.id AS input_version_id,
        iv.project_id,
        iv.branch_type,
        iv.formula_version,
        iv.payload_json,
        iv.created_at AS input_created_at
     FROM calc_runs r
     JOIN bersn_input_versions iv ON iv.id = r.input_version_id
     WHERE r.id = $1
     LIMIT 1`,
    [calcRunId],
  );

  const snap = snapRes.rows[0] || null;
  if (!snap) return null;

  // 2) Step results
  const stepsRes = await client.query(
    `SELECT step_name, result_json
       FROM calc_step_results
      WHERE calc_run_id = $1
      ORDER BY step_name`,
    [calcRunId],
  );

  // Convert to map: { AFe: {...}, EtEUI: {...}, WEIGHTS: {...} }
  const steps = {};
  for (const row of stepsRes.rows) {
    steps[row.step_name] = row.result_json;
  }

  return { ...snap, steps };
}


// Export the pool so other modules can use it directly.
export { pool };
