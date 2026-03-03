/**
 * Smoke checks for DB persistence/readback hardening:
 * - DB-backed formula endpoint persists step artifact
 * - run details endpoint returns persisted step map
 */

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function postJson(path, payload) {
  const resp = await fetch(`http://localhost:8081${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await resp.json();
  return { status: resp.status, body };
}

async function getJson(path) {
  const resp = await fetch(`http://localhost:8081${path}`);
  const body = await resp.json();
  return { status: resp.status, body };
}

async function run() {
  const projectId = '11111111-1111-1111-1111-111111111111';

  const runCreate = await postJson('/api/bersn/calc', {
    project_id: projectId,
    branch_type: 'WITHOUT_HOT_WATER',
    formula_version: 'v1.0',
    inputs: {
      E_design: 1000,
      E_baseline: 1200,
    },
  });
  assert(runCreate.status === 200, `run create expected 200, got ${runCreate.status}`);
  assert(runCreate.body?.ok === true, 'run create ok must be true');
  const calcRunId = runCreate.body.calc_run_id;
  assert(typeof calcRunId === 'string' && calcRunId.length > 0, 'calc_run_id missing');

  const score = await postJson('/api/bersn/formulas/score-general', {
    project_id: projectId,
    calc_run_id: calcRunId,
    formula_version: 'v1.0',
    inputs: {
      EEI: 0.6565272918124562,
    },
  });
  assert(score.status === 200, `score-general expected 200, got ${score.status}`);
  assert(score.body?.ok === true, 'score-general ok must be true');

  const runDetails = await getJson(`/api/bersn/runs/${calcRunId}`);
  assert(runDetails.status === 200, `run-details expected 200, got ${runDetails.status}`);
  assert(runDetails.body?.ok === true, 'run-details ok must be true');

  const steps = runDetails.body?.steps;
  assert(steps && typeof steps === 'object', 'run-details steps map missing');
  assert(steps.SCORE_GENERAL, 'run-details missing SCORE_GENERAL step');

  const persisted = steps.SCORE_GENERAL;
  assert(
    persisted.request_inputs && typeof persisted.request_inputs === 'object',
    'SCORE_GENERAL.request_inputs missing',
  );
  assert(
    persisted.response?.outputs?.SCOREEE !== undefined,
    'SCORE_GENERAL.response.outputs.SCOREEE missing',
  );

  console.log('persistence smoke checks passed');
}

run().catch((err) => {
  console.error('persistence smoke checks failed:', err.message || err);
  process.exit(1);
});

