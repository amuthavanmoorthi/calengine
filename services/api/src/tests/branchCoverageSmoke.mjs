/**
 * Smoke checks for branch coverage not fully exercised by golden-path:
 * - hot-water full pipeline
 * - renewable preprocess + bonus
 * - NZB evaluation
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

function assertOk200(response, label) {
  assert(response.status === 200, `${label}: expected 200, got ${response.status}`);
  assert(response.body?.ok === true, `${label}: ok must be true`);
}

async function run() {
  const projectId = '11111111-1111-1111-1111-111111111111';

  // Shared calc run for DB-backed formula routes.
  const runCreate = await postJson('/api/bersn/calc', {
    project_id: projectId,
    branch_type: 'WITH_HOT_WATER',
    formula_version: 'v1.0',
    inputs: {
      E_design: 1000,
      E_baseline: 1200,
    },
  });
  assertOk200(runCreate, 'run create');
  const calcRunId = runCreate.body.calc_run_id;
  assert(typeof calcRunId === 'string' && calcRunId.length > 0, 'calc_run_id missing');

  // 1) Hot-water full branch.
  const hotwaterFull = await postJson('/api/bersn/formulas/hotwater-full', {
    project_id: projectId,
    calc_run_id: calcRunId,
    formula_version: 'v1.0',
    inputs: {
      AF: 12000,
      excluded_zones: [{ type: 'indoor_parking', area_m2: 1800 }],
      elevators: [{ Nej: 4, Eelj: 8.24, YOHj: 2500 }],
      AEUI: 42.4,
      LEUI: 20.0,
      EEUI: 6.0,
      UR: 1.0,
      EEV: 0.85,
      EAC: 0.71,
      EL: 0.4921367521367521,
      Es: 0.05,
      Et: 0.5,
      beta1: 0.494,
      CFn: 0.91,
      hotwater_category: 'hotel',
      hotwater_system_type: 'electric_storage',
      NPi: 300,
    },
  });
  assertOk200(hotwaterFull, 'hotwater-full');
  assert(typeof hotwaterFull.body.outputs?.hotwater?.HpEUI === 'number', 'hotwater-full HpEUI missing');
  assert(typeof hotwaterFull.body.outputs?.weights?.d === 'number', 'hotwater-full weight d missing');
  assert(typeof hotwaterFull.body.outputs?.grade_result?.grade === 'string', 'hotwater-full grade missing');

  // 2) Renewable preprocess (Table 3.5).
  const renPre = await postJson('/api/bersn/formulas/renewable-preprocess', {
    project_id: projectId,
    calc_run_id: calcRunId,
    formula_version: 'v1.0',
    inputs: {
      renewable_type: 'pv',
      T: 1.0,
      PV_installed_capacity_kW: 100,
      pv_max_generation_efficiency_kwh_per_kw_day: 3.55,
      AFe: 10200,
    },
  });
  assertOk200(renPre, 'renewable-preprocess');
  assert(renPre.body.outputs?.GE > 0, 'renewable-preprocess GE must be > 0');
  assert(renPre.body.outputs?.Rs > 0, 'renewable-preprocess Rs must be > 0');

  // 3) Renewable bonus (pv_area_method).
  const renBonus = await postJson('/api/bersn/formulas/renewable-bonus', {
    project_id: projectId,
    calc_run_id: calcRunId,
    formula_version: 'v1.0',
    inputs: {
      method: 'pv_area_method',
      SCOREEE_before: 67.85,
      T: 1.0,
      Rs: 0.3,
    },
  });
  assertOk200(renBonus, 'renewable-bonus');
  assert(
    renBonus.body.outputs?.SCOREEE_after > renBonus.body.outputs?.SCOREEE_before,
    'renewable-bonus score should increase for positive gamma',
  );

  // 4) NZB evaluate.
  const nzbEval = await postJson('/api/bersn/formulas/nzb-evaluate', {
    project_id: projectId,
    calc_run_id: calcRunId,
    formula_version: 'v1.0',
    inputs: {
      grade: '1+',
      TEUI: 55.1,
      AFe: 10200,
      TGE: 600000,
    },
  });
  assertOk200(nzbEval, 'nzb-evaluate');
  assert(nzbEval.body.outputs?.is_nzb_pass === true, 'nzb-evaluate expected is_nzb_pass=true');

  console.log('branch-coverage smoke checks passed');
}

run().catch((err) => {
  console.error('branch-coverage smoke checks failed:', err.message || err);
  process.exit(1);
});

