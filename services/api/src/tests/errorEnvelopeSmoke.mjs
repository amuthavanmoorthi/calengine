/**
 * Lightweight runtime smoke checks for API error-envelope hardening.
 * Runs inside the API container and validates standardized error fields.
 */

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEnvelope(body) {
  assert(body && typeof body === 'object', 'response must be an object');
  assert(body.ok === false, 'ok must be false for error responses');
  assert(typeof body.error_code === 'string' && body.error_code.length > 0, 'error_code must be non-empty string');
  assert(typeof body.message === 'string' && body.message.length > 0, 'message must be non-empty string');
}

async function postJson(url, payload) {
  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const body = await resp.json();
  return { status: resp.status, body };
}

async function run() {
  // 0) classification validation failure envelope
  const classificationValidation = await postJson('http://localhost:8081/api/bersn/classification/normalize', {
    total_above_ground_floor_area_m2: 12000,
    segments: [],
  });
  assert(classificationValidation.status === 400, `expected 400, got ${classificationValidation.status}`);
  assert(classificationValidation.body.ok === false, 'classification ok must be false');
  assert(
    classificationValidation.body.error_code === 'BERSN_3_1_NORMALIZATION_ERROR',
    `expected BERSN_3_1_NORMALIZATION_ERROR, got ${classificationValidation.body.error_code}`,
  );
  assert(
    typeof classificationValidation.body.message === 'string' && classificationValidation.body.message.length > 0,
    'classification message must be non-empty string',
  );

  // 1) local API validation error (missing fields)
  const missingFields = await postJson('http://localhost:8081/api/bersn/formulas/afe', {});
  assert(missingFields.status === 400, `expected 400, got ${missingFields.status}`);
  assertEnvelope(missingFields.body);
  assert(
    missingFields.body.error_code === 'BERSN_API_VALIDATION_ERROR',
    `expected BERSN_API_VALIDATION_ERROR, got ${missingFields.body.error_code}`,
  );

  // 1b) legacy formula metadata validation (invalid formula_version)
  const legacyVersionValidation = await postJson('http://localhost:8081/api/bersn/formulas/afe', {
    project_id: '11111111-1111-1111-1111-111111111111',
    calc_run_id: 'smoke-err-001',
    formula_version: 'v2.0',
  });
  assert(legacyVersionValidation.status === 400, `expected 400, got ${legacyVersionValidation.status}`);
  assertEnvelope(legacyVersionValidation.body);
  assert(
    legacyVersionValidation.body.error_code === 'BERSN_API_VALIDATION_ERROR',
    `expected BERSN_API_VALIDATION_ERROR, got ${legacyVersionValidation.body.error_code}`,
  );

  // 2) API boundary validation (bad formula_version)
  const calcValidation = await postJson('http://localhost:8081/api/bersn/formulas/general-eei', {
    calc_run_id: 'smoke-err-001',
    formula_version: 'v2.0',
    inputs: {},
  });
  assert(calcValidation.status === 400, `expected 400, got ${calcValidation.status}`);
  assertEnvelope(calcValidation.body);
  assert(
    calcValidation.body.error_code === 'BERSN_API_VALIDATION_ERROR',
    `expected BERSN_API_VALIDATION_ERROR, got ${calcValidation.body.error_code}`,
  );

  // 3) profile validation for renewable-bonus
  const renewableValidation = await postJson('http://localhost:8081/api/bersn/formulas/renewable-bonus', {
    project_id: '11111111-1111-1111-1111-111111111111',
    calc_run_id: 'smoke-err-001',
    formula_version: 'v1.0',
    inputs: { method: 'invalid_method' },
  });
  assert(renewableValidation.status === 400, `expected 400, got ${renewableValidation.status}`);
  assertEnvelope(renewableValidation.body);
  assert(
    renewableValidation.body.error_code === 'BERSN_API_VALIDATION_ERROR',
    `expected BERSN_API_VALIDATION_ERROR, got ${renewableValidation.body.error_code}`,
  );

  // 4) calc-layer validation must be preserved by API proxy (422 passthrough contract).
  const runCreate = await postJson('http://localhost:8081/api/bersn/calc', {
    project_id: '11111111-1111-1111-1111-111111111111',
    branch_type: 'WITHOUT_HOT_WATER',
    formula_version: 'v1.0',
    inputs: {
      E_design: 1000,
      E_baseline: 1200,
    },
  });
  assert(runCreate.status === 200, `calc run create expected 200, got ${runCreate.status}`);
  assert(runCreate.body && runCreate.body.ok === true, 'calc run create ok must be true');
  const calcRunId = runCreate.body.calc_run_id;
  assert(typeof calcRunId === 'string' && calcRunId.length > 0, 'calc run id missing');

  // EEI<0 passes API boundary (finite number) but fails calc business validation with 422.
  const calcValidationPassthrough = await postJson('http://localhost:8081/api/bersn/formulas/score-general', {
    project_id: '11111111-1111-1111-1111-111111111111',
    calc_run_id: calcRunId,
    formula_version: 'v1.0',
    inputs: {
      EEI: -1,
    },
  });
  assert(calcValidationPassthrough.status === 422, `expected 422, got ${calcValidationPassthrough.status}`);
  assertEnvelope(calcValidationPassthrough.body);
  assert(
    calcValidationPassthrough.body.error_code === 'CALC_ENGINE_VALIDATION_ERROR',
    `expected CALC_ENGINE_VALIDATION_ERROR, got ${calcValidationPassthrough.body.error_code}`,
  );
  assert(
    calcValidationPassthrough.body.details
      && calcValidationPassthrough.body.details.calc_status === 422,
    'details.calc_status must be 422',
  );
  const calcDetail = calcValidationPassthrough.body.details?.calc_response?.detail;
  assert(calcDetail !== undefined && calcDetail !== null, 'calc_response.detail must be present');

  console.log('error-envelope smoke checks passed');
}

run().catch((err) => {
  console.error('error-envelope smoke checks failed:', err.message || err);
  process.exit(1);
});
