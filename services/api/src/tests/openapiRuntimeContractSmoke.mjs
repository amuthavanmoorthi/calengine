/**
 * Runtime/OpenAPI contract smoke checks (success-path shape assertions).
 *
 * Purpose:
 * - ensure key API 200 responses include fields required by OpenAPI schemas
 * - detect accidental response-shape drift during refactors
 */

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertFiniteNumber(value, fieldName) {
  assert(typeof value === 'number' && Number.isFinite(value), `${fieldName} must be a finite number`);
}

async function postJson(url, payload) {
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  let body;
  try {
    body = await resp.json();
  } catch (_) {
    body = null;
  }
  return { status: resp.status, body };
}

function bodyPreview(body) {
  try {
    return JSON.stringify(body);
  } catch (_) {
    return String(body);
  }
}

function assertStatus(response, expectedStatus, label) {
  assert(
    response.status === expectedStatus,
    `${label} expected ${expectedStatus}, got ${response.status}; body=${bodyPreview(response.body)}`,
  );
}

async function run() {
  // 1) /api/bersn/classification/normalize success contract.
  const classification = await postJson('http://localhost:8081/api/bersn/classification/normalize', {
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
        appendix1_code: 'K1',
        table_3_2_label: 'B-2 商場百貨',
        display_name: 'Dept Store',
        area_m2: 3000,
        operation_mode: 'all_year',
        urban_zone: 'A',
      },
    ],
  });

  assertStatus(classification, 200, 'classification');
  assert(classification.body && classification.body.ok === true, 'classification ok must be true');
  assert(classification.body.result && typeof classification.body.result === 'object', 'classification result must be object');
  assert(classification.body.result.summary && typeof classification.body.result.summary === 'object', 'classification summary missing');
  assert(Array.isArray(classification.body.result.segments), 'classification segments must be array');
  assert(classification.body.result.segments.length >= 1, 'classification segments must be non-empty');

  // 2) /api/bersn/formulas/general-eei success contract.
  const generalEei = await postJson('http://localhost:8081/api/bersn/formulas/general-eei', {
    calc_run_id: 'smoke-contract-001',
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

  assertStatus(generalEei, 200, 'general-eei');
  assert(generalEei.body && generalEei.body.ok === true, 'general-eei ok must be true');
  assert(typeof generalEei.body.calc_run_id === 'string', 'general-eei calc_run_id missing');
  assert(generalEei.body.formula_version === 'v1.0', 'general-eei formula_version must be v1.0');
  assert(generalEei.body.outputs && typeof generalEei.body.outputs === 'object', 'general-eei outputs missing');
  assert(generalEei.body.trace && typeof generalEei.body.trace === 'object', 'general-eei trace missing');

  assertFiniteNumber(generalEei.body.outputs.AFe, 'general-eei outputs.AFe');
  assertFiniteNumber(generalEei.body.outputs.EtEUI, 'general-eei outputs.EtEUI');
  assertFiniteNumber(generalEei.body.outputs.EEI, 'general-eei outputs.EEI');
  assert(generalEei.body.outputs.weights && typeof generalEei.body.outputs.weights === 'object', 'general-eei outputs.weights missing');
  assertFiniteNumber(generalEei.body.outputs.weights.a, 'general-eei outputs.weights.a');
  assertFiniteNumber(generalEei.body.outputs.weights.b, 'general-eei outputs.weights.b');
  assertFiniteNumber(generalEei.body.outputs.weights.c, 'general-eei outputs.weights.c');

  // 3) Create one DB-backed calc run to exercise /api/bersn/formulas/* stored-step routes.
  const runCreate = await postJson('http://localhost:8081/api/bersn/calc', {
    project_id: '11111111-1111-1111-1111-111111111111',
    branch_type: 'WITHOUT_HOT_WATER',
    formula_version: 'v1.0',
    inputs: {
      E_design: 1000,
      E_baseline: 1200,
    },
  });
  assertStatus(runCreate, 200, 'calc create');
  assert(runCreate.body && runCreate.body.ok === true, 'calc create ok must be true');
  const calcRunId = runCreate.body.calc_run_id;
  assert(typeof calcRunId === 'string' && calcRunId.length > 0, 'calc_run_id missing from calc create');
  const projectId = '11111111-1111-1111-1111-111111111111';

  // 4) /api/bersn/formulas/general-full success contract.
  const generalFull = await postJson('http://localhost:8081/api/bersn/formulas/general-full', {
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
      EAC: 0.72,
      EEV: 0.85,
      Es: 0.05,
      EL: 0.65,
      Et: 0.5,
      beta1: 0.474,
      CFn: 0.91,
    },
  });

  assertStatus(generalFull, 200, 'general-full');
  assert(generalFull.body && generalFull.body.ok === true, 'general-full ok must be true');
  assert(generalFull.body.outputs && typeof generalFull.body.outputs === 'object', 'general-full outputs missing');
  assertFiniteNumber(generalFull.body.outputs.EEI, 'general-full outputs.EEI');
  assertFiniteNumber(generalFull.body.outputs.SCOREEE, 'general-full outputs.SCOREEE');
  assert(generalFull.body.outputs.scale_values && typeof generalFull.body.outputs.scale_values === 'object', 'general-full scale_values missing');
  assert(generalFull.body.outputs.indicators && typeof generalFull.body.outputs.indicators === 'object', 'general-full indicators missing');
  assert(generalFull.body.outputs.grade_result && typeof generalFull.body.outputs.grade_result === 'object', 'general-full grade_result missing');

  // 5) /api/bersn/formulas/hotwater-full success contract.
  const hotwaterFull = await postJson('http://localhost:8081/api/bersn/formulas/hotwater-full', {
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
      EAC: 0.72,
      EEV: 0.85,
      Es: 0.05,
      EL: 0.65,
      Et: 0.5,
      beta1: 0.474,
      CFn: 0.91,
      hotwater_category: 'hotel',
      hotwater_system_type: 'electric_storage',
      NPi: 300,
    },
  });

  assertStatus(hotwaterFull, 200, 'hotwater-full');
  assert(hotwaterFull.body && hotwaterFull.body.ok === true, 'hotwater-full ok must be true');
  assert(hotwaterFull.body.outputs && typeof hotwaterFull.body.outputs === 'object', 'hotwater-full outputs missing');
  assertFiniteNumber(hotwaterFull.body.outputs.EEI, 'hotwater-full outputs.EEI');
  assertFiniteNumber(hotwaterFull.body.outputs.SCOREEE, 'hotwater-full outputs.SCOREEE');
  assert(hotwaterFull.body.outputs.hotwater && typeof hotwaterFull.body.outputs.hotwater === 'object', 'hotwater-full hotwater output missing');
  assert(hotwaterFull.body.outputs.scale_values && typeof hotwaterFull.body.outputs.scale_values === 'object', 'hotwater-full scale_values missing');
  assert(hotwaterFull.body.outputs.indicators && typeof hotwaterFull.body.outputs.indicators === 'object', 'hotwater-full indicators missing');
  assert(hotwaterFull.body.outputs.grade_result && typeof hotwaterFull.body.outputs.grade_result === 'object', 'hotwater-full grade_result missing');

  console.log('openapi runtime contract smoke checks passed');
}

run().catch((err) => {
  console.error('openapi runtime contract smoke checks failed:', err.message || err);
  process.exit(1);
});
