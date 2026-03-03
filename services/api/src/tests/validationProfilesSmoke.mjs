/**
 * Smoke checks for API validation profiles on formula endpoints.
 *
 * This suite verifies API-boundary schema guards reject malformed payloads
 * before DB/calc work, using deterministic 400 responses.
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

  let body = null;
  try {
    body = await resp.json();
  } catch (_) {
    body = null;
  }

  return { status: resp.status, body };
}

function assertValidationError(response, expectedMessageContains, label) {
  assert(response.status === 400, `${label}: expected 400, got ${response.status}`);
  assert(response.body && response.body.ok === false, `${label}: ok must be false`);
  assert(
    response.body.error_code === 'BERSN_API_VALIDATION_ERROR',
    `${label}: expected BERSN_API_VALIDATION_ERROR, got ${response.body.error_code}`,
  );
  assert(
    typeof response.body.message === 'string' && response.body.message.includes(expectedMessageContains),
    `${label}: message must include "${expectedMessageContains}", got "${response.body.message}"`,
  );
}

async function run() {
  const baseMeta = {
    project_id: '11111111-1111-1111-1111-111111111111',
    calc_run_id: 'smoke-profile-001',
    formula_version: 'v1.0',
  };

  const cases = [
    {
      label: 'general-eei missing AF',
      path: '/api/bersn/formulas/general-eei',
      payload: {
        calc_run_id: 'smoke-profile-001',
        formula_version: 'v1.0',
        inputs: {
          elevators: [{ Nej: 1, Eelj: 2, YOHj: 2000 }],
          AEUI: 1,
          LEUI: 1,
          EAC: 1,
          EEV: 1,
          Es: 1,
          EL: 1,
          Et: 1,
        },
      },
      expectContains: 'inputs.AF',
    },
    {
      label: 'renewable-bonus invalid method',
      path: '/api/bersn/formulas/renewable-bonus',
      payload: {
        ...baseMeta,
        inputs: {
          method: 'bad',
        },
      },
      expectContains: 'inputs.method',
    },
    {
      label: 'nzb-balance missing TEUI',
      path: '/api/bersn/formulas/nzb-balance',
      payload: {
        ...baseMeta,
        inputs: {
          AFe: 10200,
          TGE: 600000,
        },
      },
      expectContains: 'inputs.TEUI',
    },
    {
      label: 'hotwater-preprocess missing category',
      path: '/api/bersn/formulas/hotwater-preprocess',
      payload: {
        ...baseMeta,
        inputs: {
          AFe: 10200,
          hotwater_system_type: 'electric_storage',
        },
      },
      expectContains: 'inputs.hotwater_category',
    },
    {
      label: 'eac missing method',
      path: '/api/bersn/formulas/eac',
      payload: {
        ...baseMeta,
        inputs: {},
      },
      expectContains: 'inputs.eac_method',
    },
    {
      label: 'el missing totals and spaces',
      path: '/api/bersn/formulas/el',
      payload: {
        ...baseMeta,
        inputs: {},
      },
      expectContains: 'el_numerator_total',
    },
  ];

  for (const testCase of cases) {
    const response = await postJson(testCase.path, testCase.payload);
    assertValidationError(response, testCase.expectContains, testCase.label);
  }

  console.log('validation-profiles smoke checks passed');
}

run().catch((err) => {
  console.error('validation-profiles smoke checks failed:', err.message || err);
  process.exit(1);
});
