/**
 * Golden-path smoke checks for deterministic formula behavior.
 *
 * Goal:
 * - catch silent regression in representative successful calculations
 * - assert known outputs (with tolerance where needed)
 */

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function approxEqual(actual, expected, tolerance, label) {
  const diff = Math.abs(actual - expected);
  assert(
    diff <= tolerance,
    `${label}: expected ${expected} +/- ${tolerance}, got ${actual} (diff=${diff})`,
  );
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

async function run() {
  const projectId = '11111111-1111-1111-1111-111111111111';

  // 1) Create a run id for DB-backed formula endpoints.
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
  assert(runCreate.body.ok === true, 'run create ok must be true');
  const calcRunId = runCreate.body.calc_run_id;
  assert(typeof calcRunId === 'string' && calcRunId.length > 0, 'calc_run_id missing');

  // 2) Golden check for 3-1 normalization logic.
  const normalize = await postJson('/api/bersn/classification/normalize', {
    total_above_ground_floor_area_m2: 12000,
    segments: [
      {
        appendix1_code: 'G2',
        table_3_2_label: 'G-2 辦公場所',
        display_name: 'Office',
        area_m2: 9000,
        operation_mode: 'all_year',
        urban_zone: 'A',
      },
      {
        appendix1_code: 'K3',
        table_3_2_label: 'B-3 餐飲場所',
        display_name: 'Restaurant',
        area_m2: 400,
        operation_mode: 'all_year',
        urban_zone: 'A',
      },
      {
        appendix1_code: 'K1',
        table_3_2_label: 'B-2 商場百貨',
        display_name: 'Dept Store',
        area_m2: 2600,
        operation_mode: 'all_year',
        urban_zone: 'A',
      },
    ],
  });
  assert(normalize.status === 200, `normalize expected 200, got ${normalize.status}`);
  assert(normalize.body.ok === true, 'normalize ok must be true');
  assert(normalize.body.result.summary.evaluated_segment_count === 2, 'evaluated_segment_count must be 2');
  assert(normalize.body.result.summary.evaluated_segment_area_m2 === 11600, 'evaluated_segment_area_m2 must be 11600');
  assert(normalize.body.result.segments[1].threshold_rule.include_in_evaluation === false, '2nd segment should be excluded by 5%/1000m2 rule');

  // 3) Golden check for general EEI stateless path.
  const generalEei = await postJson('/api/bersn/formulas/general-eei', {
    calc_run_id: 'golden-general-eei-001',
    formula_version: 'v1.0',
    inputs: {
      AF: 12000,
      excluded_zones: [{ type: 'indoor_parking', area_m2: 1800 }],
      elevators: [{ Nej: 4, Eelj: 8.24, YOHj: 2500 }],
      AEUI: 42.4,
      LEUI: 20.0,
      EAC: 0.72,
      EEV: 0.85,
      Es: 0.05,
      EL: 0.65,
      Et: 0.5,
    },
  });
  assert(generalEei.status === 200, `general-eei expected 200, got ${generalEei.status}`);
  assert(generalEei.body.ok === true, 'general-eei ok must be true');
  approxEqual(generalEei.body.outputs.AFe, 10200, 1e-9, 'general-eei AFe');
  approxEqual(generalEei.body.outputs.EtEUI, 4.847058823529411, 1e-12, 'general-eei EtEUI');
  approxEqual(generalEei.body.outputs.EEI, 0.6565272918124562, 1e-12, 'general-eei EEI');

  // 4) Golden check for score endpoint (DB-backed proxy route).
  const scoreGeneral = await postJson('/api/bersn/formulas/score-general', {
    project_id: projectId,
    calc_run_id: calcRunId,
    formula_version: 'v1.0',
    inputs: {
      EEI: 0.6565272918124562,
    },
  });
  assert(scoreGeneral.status === 200, `score-general expected 200, got ${scoreGeneral.status}`);
  assert(scoreGeneral.body.ok === true, 'score-general ok must be true');
  approxEqual(scoreGeneral.body.outputs.SCOREEE, 69.12969442500585, 1e-12, 'score-general SCOREEE');

  // 5) Golden check for grade mapping endpoint (DB-backed proxy route).
  const gradeGeneral = await postJson('/api/bersn/formulas/grade-general', {
    project_id: projectId,
    calc_run_id: calcRunId,
    formula_version: 'v1.0',
    inputs: {
      SCOREEE: 69.12969442500585,
      EUI_star: 50.1495294117647,
      EUIn: 39.62352941176471,
      EUIg: 59.797647058823536,
      EUImax: 140.49411764705883,
    },
  });
  assert(gradeGeneral.status === 200, `grade-general expected 200, got ${gradeGeneral.status}`);
  assert(gradeGeneral.body.ok === true, 'grade-general ok must be true');
  assert(gradeGeneral.body.outputs.grade === '3', `grade-general grade expected 3, got ${gradeGeneral.body.outputs.grade}`);

  console.log('golden-path smoke checks passed');
}

run().catch((err) => {
  console.error('golden-path smoke checks failed:', err.message || err);
  process.exit(1);
});
