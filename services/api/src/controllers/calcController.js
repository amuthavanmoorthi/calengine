/**
 * API controller layer for BERSn.
 *
 * Responsibilities:
 * - validate route-level required fields
 * - enforce calc_run/project ownership for DB-backed endpoints
 * - call calc service endpoints
 * - persist input/result/step snapshots for audit trail
 */
import crypto from 'crypto';
import {
  insertInputVersion, createCalcRun, saveCalcResult, updateRunStatus, pool,
  getRunInputSnapshot, saveStepResult, getStepResult, getRunWithSteps
} from '../models/calcModel.js';
import {
  applyManagedBeta1ToInputs,
  scheduleBeta1Verification,
  shouldInjectManagedBeta1,
} from '../services/beta1Service.js';


const { CALC_URL = 'http://bersn_calc:8000' } = process.env;
const CALC_TIMEOUT_MS = Number(process.env.CALC_TIMEOUT_MS || 15000);
const CALC_MAX_RETRIES = Number(process.env.CALC_MAX_RETRIES || 1);
const CALC_RETRY_BACKOFF_MS = Number(process.env.CALC_RETRY_BACKOFF_MS || 200);
const MAX_ID_LENGTH = Number(process.env.API_MAX_ID_LENGTH || 128);
const MAX_INPUTS_BYTES = Number(process.env.API_MAX_INPUTS_BYTES || 800000);

const FORMULA_INPUT_PROFILES = {
  '/calc/bersn/formulas/preprocess-efficiency': {
    // EEV/EAC/EL can be direct OR derived from appendix inputs; enforce minimum presence.
    custom: (inputs) => {
      const hasEEVDirect = typeof inputs.EEV === 'number' && Number.isFinite(inputs.EEV);
      const hasEEVDerived = ['ev_scheme', 'ev_indicator', 'EV', 'building', 'envelope'].every((k) => inputs[k] !== undefined);
      if (!hasEEVDirect && !hasEEVDerived) {
        return 'inputs must include EEV directly or EEV appendix fields (ev_scheme, ev_indicator, EV, building, envelope)';
      }

      const hasEACDirect = typeof inputs.EAC === 'number' && Number.isFinite(inputs.EAC);
      const hasEACDerived = typeof inputs.eac_method === 'string' && inputs.eac_method.trim().length > 0;
      if (!hasEACDirect && !hasEACDerived) {
        return 'inputs must include EAC directly or eac_method for EAC computation';
      }

      const hasELDirect = typeof inputs.EL === 'number' && Number.isFinite(inputs.EL);
      const hasELDerivedSpaces = Array.isArray(inputs.el_spaces) && inputs.el_spaces.length > 0;
      const hasELDerivedTotals = (
        typeof inputs.el_numerator_total === 'number'
        && Number.isFinite(inputs.el_numerator_total)
        && typeof inputs.el_denominator_total === 'number'
        && Number.isFinite(inputs.el_denominator_total)
      );
      if (!hasELDirect && !hasELDerivedSpaces && !hasELDerivedTotals) {
        return 'inputs must include EL directly, or el_spaces, or (el_numerator_total + el_denominator_total)';
      }

      return null;
    },
  },
  '/calc/bersn/formulas/eac': {
    requiredStrings: ['eac_method'],
  },
  '/calc/bersn/formulas/el': {
    custom: (inputs) => {
      const hasTotals = (
        typeof inputs.el_numerator_total === 'number'
        && Number.isFinite(inputs.el_numerator_total)
        && typeof inputs.el_denominator_total === 'number'
        && Number.isFinite(inputs.el_denominator_total)
      );
      const hasSpaces = Array.isArray(inputs.el_spaces) && inputs.el_spaces.length > 0;
      if (!hasTotals && !hasSpaces) {
        return 'inputs must include (el_numerator_total + el_denominator_total) or non-empty el_spaces';
      }
      return null;
    },
  },
  '/calc/bersn/formulas/hotwater-preprocess': {
    requiredNumbers: ['AFe'],
    requiredStrings: ['hotwater_category'],
    custom: (inputs) => {
      const hasSystemType = typeof inputs.hotwater_system_type === 'string' && inputs.hotwater_system_type.trim().length > 0;
      const hasEhwOverride = typeof inputs.ehw_override === 'number' && Number.isFinite(inputs.ehw_override);
      if (!hasSystemType && !hasEhwOverride) {
        return 'inputs must include hotwater_system_type or ehw_override';
      }
      return null;
    },
  },
  '/calc/bersn/formulas/renewable-preprocess': {
    requiredStrings: ['renewable_type'],
  },
  '/calc/bersn/formulas/renewable-bonus': {
    requiredStrings: ['method'],
    custom: (inputs) => {
      const method = String(inputs.method || '').trim();
      if (!['pv_area_method', 'generation_method'].includes(method)) {
        return "inputs.method must be 'pv_area_method' or 'generation_method'";
      }
      if (method === 'pv_area_method') {
        for (const field of ['SCOREEE_before', 'Rs']) {
          const value = inputs[field];
          if (typeof value !== 'number' || !Number.isFinite(value)) {
            return `inputs.${field} must be a finite number for pv_area_method`;
          }
        }
      } else {
        for (const field of ['EEI_before', 'EUI_star', 'AFe', 'GE', 'SCOREEE_before']) {
          const value = inputs[field];
          if (typeof value !== 'number' || !Number.isFinite(value)) {
            return `inputs.${field} must be a finite number for generation_method`;
          }
        }
      }
      return null;
    },
  },
  '/calc/bersn/formulas/nzb-eligibility': {
    requiredStrings: ['grade'],
  },
  '/calc/bersn/formulas/nzb-balance': {
    requiredNumbers: ['TEUI', 'AFe', 'TGE'],
  },
  '/calc/bersn/formulas/nzb-evaluate': {
    requiredStrings: ['grade'],
    requiredNumbers: ['TEUI', 'AFe', 'TGE'],
  },
  '/calc/bersn/formulas/general-eei': {
    requiredNumbers: ['AF', 'AEUI', 'LEUI', 'EAC', 'EEV', 'Es', 'EL', 'Et'],
    requiredArrays: ['elevators'],
  },
  '/calc/bersn/formulas/eei-general': {
    requiredNumbers: ['a', 'b', 'c', 'EAC', 'EEV', 'Es', 'EL', 'Et'],
  },
  '/calc/bersn/formulas/score-general': {
    requiredNumbers: ['EEI'],
  },
  '/calc/bersn/formulas/scale-values-general': {
    requiredNumbers: ['AEUI', 'LEUI', 'EEUI', 'EtEUI', 'UR'],
  },
  '/calc/bersn/formulas/indicators-general': {
    requiredNumbers: ['SCOREEE', 'EUIn', 'EUIg', 'EUIm', 'EUImax', 'beta1', 'CFn'],
  },
  '/calc/bersn/formulas/grade-general': {
    requiredNumbers: ['SCOREEE', 'EUI_star', 'EUIn', 'EUIg', 'EUImax'],
  },
  '/calc/bersn/formulas/general-full': {
    requiredNumbers: ['AF', 'AEUI', 'LEUI', 'EEUI', 'UR', 'Es', 'Et', 'beta1', 'CFn'],
    requiredArrays: ['elevators'],
  },
  '/calc/bersn/formulas/hotwater-full': {
    requiredNumbers: ['AF', 'AEUI', 'LEUI', 'EEUI', 'UR', 'Es', 'Et', 'beta1', 'CFn'],
    requiredArrays: ['elevators'],
    requiredStrings: ['hotwater_category'],
  },
};

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function validateIdentifier(value, fieldName) {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return `${fieldName} must be a non-empty string`;
  }
  if (value.length > MAX_ID_LENGTH) {
    return `${fieldName} exceeds max length (${MAX_ID_LENGTH})`;
  }
  return null;
}

function validateFormulaVersion(formulaVersion) {
  if (formulaVersion !== 'v1.0') {
    return "formula_version must be 'v1.0'";
  }
  return null;
}

function validateLegacyStepMeta({ project_id, calc_run_id, formula_version }) {
  if (!project_id || !calc_run_id || !formula_version) {
    return 'Missing required fields: project_id, calc_run_id, formula_version';
  }
  const projectValidationError = validateIdentifier(project_id, 'project_id');
  if (projectValidationError) return projectValidationError;
  const calcRunIdError = validateIdentifier(calc_run_id, 'calc_run_id');
  if (calcRunIdError) return calcRunIdError;
  const formulaVersionError = validateFormulaVersion(formula_version);
  if (formulaVersionError) return formulaVersionError;
  return null;
}

function validateInputsEnvelope(inputs) {
  if (!isPlainObject(inputs)) {
    return 'inputs must be an object';
  }
  const payloadBytes = Buffer.byteLength(JSON.stringify(inputs), 'utf8');
  if (payloadBytes > MAX_INPUTS_BYTES) {
    return `inputs payload exceeds max size (${MAX_INPUTS_BYTES} bytes)`;
  }
  return null;
}

function validateFormulaInputsByProfile(calcPath, inputs) {
  const profile = FORMULA_INPUT_PROFILES[calcPath];
  if (!profile) return null;

  for (const field of profile.requiredNumbers || []) {
    const value = inputs[field];
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      return `inputs.${field} must be a finite number`;
    }
  }

  for (const field of profile.requiredArrays || []) {
    const value = inputs[field];
    if (!Array.isArray(value)) {
      return `inputs.${field} must be an array`;
    }
  }

  for (const field of profile.requiredStrings || []) {
    const value = inputs[field];
    if (typeof value !== 'string' || value.trim().length === 0) {
      return `inputs.${field} must be a non-empty string`;
    }
  }

  if (typeof profile.custom === 'function') {
    return profile.custom(inputs);
  }

  return null;
}

function buildApiError({ error_code, message, details = undefined }) {
  const payload = {
    ok: false,
    error_code,
    message,
  };
  if (details !== undefined) {
    payload.details = details;
  }
  return payload;
}

function buildApiSuccess(data = {}) {
  return {
    ok: true,
    ...data,
  };
}

function sendApiError(res, status, error_code, message, details = undefined) {
  return res.status(status).json(buildApiError({ error_code, message, details }));
}

function sendApiSuccess(res, status, data = {}) {
  return res.status(status).json(buildApiSuccess(data));
}

async function parseCalcErrorResponse(resp) {
  const text = await resp.text();
  try {
    return JSON.parse(text);
  } catch (_) {
    return { message: text };
  }
}

function normalizeCalcErrorPayload(parsed) {
  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
    if (parsed.detail === undefined || parsed.detail === null) {
      return {
        ...parsed,
        detail: parsed.message || parsed.error || JSON.stringify(parsed),
      };
    }
    return parsed;
  }
  return {
    detail: String(parsed),
  };
}


function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}


function isRetryableCalcStatus(status) {
  return [408, 429, 500, 502, 503, 504].includes(status);
}

function isCalcTransportError(err) {
  return Boolean(err && err.__bersnCalcTransportError === true);
}

function resolveCalcTransportError(err) {
  if (err?.name === 'AbortError') {
    return {
      status: 504,
      error_code: 'CALC_ENGINE_TIMEOUT',
      message: `Calc engine request timed out after ${CALC_TIMEOUT_MS}ms.`,
    };
  }

  const transportCode = String(err?.cause?.code || err?.code || '').toUpperCase();
  if (['ECONNREFUSED', 'ENOTFOUND', 'EHOSTUNREACH', 'ECONNRESET', 'ETIMEDOUT'].includes(transportCode)) {
    return {
      status: 502,
      error_code: 'CALC_ENGINE_UNAVAILABLE',
      message: 'Calc engine is unavailable.',
    };
  }

  return {
    status: 500,
    error_code: 'BERSN_API_INTERNAL_ERROR',
    message: 'Internal server error.',
  };
}

function sendCalcTransportError(res, requestId, err) {
  const normalized = resolveCalcTransportError(err);
  return sendApiError(
    res,
    normalized.status,
    normalized.error_code,
    normalized.message,
    { request_id: requestId, reason: String(err?.message || err) },
  );
}

async function rollbackQuietly(client) {
  try {
    await client.query('ROLLBACK');
  } catch (_) {}
}


async function callCalcWithTimeoutRetry({
  path,
  payload,
  requestId,
}) {
  let lastError = null;
  for (let attempt = 0; attempt <= CALC_MAX_RETRIES; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), CALC_TIMEOUT_MS);
    try {
      const resp = await fetch(`${CALC_URL}${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-request-id': String(requestId || ''),
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (resp.ok) return resp;

      if (attempt < CALC_MAX_RETRIES && isRetryableCalcStatus(resp.status)) {
        await sleep(CALC_RETRY_BACKOFF_MS * (2 ** attempt));
        continue;
      }
      return resp;
    } catch (err) {
      clearTimeout(timeout);
      try {
        err.__bersnCalcTransportError = true;
      } catch (_) {}
      lastError = err;
      if (attempt < CALC_MAX_RETRIES) {
        await sleep(CALC_RETRY_BACKOFF_MS * (2 ** attempt));
        continue;
      }
      throw err;
    }
  }
  throw lastError || new Error('Unknown calc service call failure');
}

/**
 * Controller to handle BERSn calculation requests.
 *
 * Validates the request, manages a DB transaction, calls the Python calculation engine,
 * persists input and output snapshots, and returns the result.
 */
export async function runCalc(req, res) {
  const { project_id, branch_type, formula_version, inputs } = req.body || {};

  // Minimal request log for operational audit without dumping raw payload content.
  console.log('[BERSn runCalc] request received', {
    project_id,
    branch_type,
    formula_version,
    input_key_count: Object.keys(inputs || {}).length,
  });


  if (!project_id || !branch_type || !formula_version || !inputs) {
    return sendApiError(
      res,
      400,
      'BERSN_API_VALIDATION_ERROR',
      'Missing required fields: project_id, branch_type, formula_version, inputs',
      { request_id: req.requestId },
    );
  }

  const projectValidationError = validateIdentifier(project_id, 'project_id');
  if (projectValidationError) {
    return sendApiError(res, 400, 'BERSN_API_VALIDATION_ERROR', projectValidationError, { request_id: req.requestId });
  }
  const branchValidationError = validateIdentifier(branch_type, 'branch_type');
  if (branchValidationError) {
    return sendApiError(res, 400, 'BERSN_API_VALIDATION_ERROR', branchValidationError, { request_id: req.requestId });
  }
  const formulaVersionError = validateFormulaVersion(formula_version);
  if (formulaVersionError) {
    return sendApiError(res, 400, 'BERSN_API_VALIDATION_ERROR', formulaVersionError, { request_id: req.requestId });
  }
  const inputsEnvelopeError = validateInputsEnvelope(inputs);
  if (inputsEnvelopeError) {
    return sendApiError(res, 400, 'BERSN_API_VALIDATION_ERROR', inputsEnvelopeError, { request_id: req.requestId });
  }
  const inputVersionId = crypto.randomUUID();
  const calcRunId = crypto.randomUUID();
  const client = await pool.connect();
  try {
    const { inputs: managedInputs } = await applyManagedBeta1ToInputs(client, inputs);
    const payloadJson = { branch_type, formula_version, inputs: managedInputs };
    const inputsHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(payloadJson))
      .digest('hex');

    await client.query('BEGIN');

    // 1) Insert input snapshot
    await insertInputVersion(client, inputVersionId, project_id, branch_type, formula_version, payloadJson);

    // 2) Create calc run
    await createCalcRun(client, calcRunId, inputVersionId, inputsHash);

    // 3) Call Python calc engine
    const calcResp = await callCalcWithTimeoutRetry({
      path: '/calc/bersn/run',
      requestId: req.requestId,
      payload: {
        calc_run_id: calcRunId,
        branch_type,
        formula_version,
        inputs: managedInputs,
      },
    });

    if (!calcResp.ok) {
      const parsed = await parseCalcErrorResponse(calcResp);
      const normalizedParsed = normalizeCalcErrorPayload(parsed);
      await client.query('ROLLBACK');
      // best effort mark failed on the pool
      try {
        await updateRunStatus(pool, calcRunId, 'FAILED', JSON.stringify(normalizedParsed));
      } catch (_) {}
      return sendApiError(
        res,
        calcResp.status,
        'CALC_ENGINE_VALIDATION_ERROR',
        'Calc engine request failed.',
        {
          request_id: req.requestId,
          calc_status: calcResp.status,
          calc_response: normalizedParsed,
        },
      );
    }

    const resultJson = await calcResp.json();

    // 4) Save result artefact
    await saveCalcResult(client, calcRunId, resultJson);

    // 5) Mark run success
    await updateRunStatus(client, calcRunId, 'SUCCEEDED');

    await client.query('COMMIT');
    scheduleBeta1Verification(req.requestId);

    return sendApiSuccess(res, 200, {
      calc_run_id: calcRunId,
      input_version_id: inputVersionId,
      result: resultJson,
    });
  } catch (e) {
    try {
      await client.query('ROLLBACK');
    } catch (_) {}

    if (isCalcTransportError(e)) {
      return sendCalcTransportError(res, req.requestId, e);
    }

    // best effort mark failed on the pool
    try {
      await updateRunStatus(pool, calcRunId, 'FAILED', String(e.message || e));
    } catch (_) {}

    return sendApiError(
      res,
      500,
      'BERSN_API_INTERNAL_ERROR',
      'Internal server error.',
      { request_id: req.requestId, reason: String(e.message || e) },
    );
  } finally {
    client.release();
  }
}


// For the AFE Calculation 

export async function runAFe(req, res) {
  const { project_id, calc_run_id, formula_version } = req.body || {};

  const metaError = validateLegacyStepMeta({ project_id, calc_run_id, formula_version });
  if (metaError) {
    return sendApiError(
      res,
      400,
      'BERSN_API_VALIDATION_ERROR',
      metaError,
      { request_id: req.requestId },
    );
  }

  const client = await pool.connect();
  let transactionOpen = false;
  try {
    await client.query('BEGIN');
    transactionOpen = true;

    // 1) Load input snapshot for this run
    const snap = await getRunInputSnapshot(client, calc_run_id);
    if (!snap) {
      await rollbackQuietly(client);
      transactionOpen = false;
      return sendApiError(res, 404, 'BERSN_NOT_FOUND', 'calc_run_id not found', { request_id: req.requestId });
    }

    // 2) Ensure the run belongs to the project_id caller provided
    if (String(snap.project_id) !== String(project_id)) {
      await rollbackQuietly(client);
      transactionOpen = false;
      return sendApiError(
        res,
        400,
        'BERSN_API_VALIDATION_ERROR',
        'project_id does not match calc_run_id',
        { request_id: req.requestId },
      );
    }

    // 3) Extract inputs from stored payload_json
    // Your payload_json is stored as: { branch_type, formula_version, inputs }
    const storedPayload = snap.payload_json || {};
    const storedInputs = storedPayload.inputs || {};

    const AF = storedInputs.AF;
    const exempt_areas = storedInputs.exempt_areas || [];
    const excluded_zones = storedInputs.excluded_zones || null;

    if (AF === undefined || AF === null) {
      await rollbackQuietly(client);
      transactionOpen = false;
      return sendApiError(res, 422, 'BERSN_INPUT_VALIDATION_ERROR', 'Stored inputs missing: AF', { request_id: req.requestId });
    }
    if (!Array.isArray(exempt_areas)) {
      await rollbackQuietly(client);
      transactionOpen = false;
      return sendApiError(
        res,
        422,
        'BERSN_INPUT_VALIDATION_ERROR',
        'Stored inputs invalid: exempt_areas must be an array',
        { request_id: req.requestId },
      );
    }
    if (excluded_zones !== null && !Array.isArray(excluded_zones)) {
      await rollbackQuietly(client);
      transactionOpen = false;
      return sendApiError(
        res,
        422,
        'BERSN_INPUT_VALIDATION_ERROR',
        'Stored inputs invalid: excluded_zones must be an array when provided',
        { request_id: req.requestId },
      );
    }

    // 4) Call Python formula endpoint (must exist on calc service)
    const pyResp = await callCalcWithTimeoutRetry({
      path: '/calc/bersn/formulas/afe',
      requestId: req.requestId,
      payload: {
        calc_run_id,
        formula_version,
        inputs: {
          AF,
          exempt_areas,
          excluded_zones,
        },
      },
    });

    if (!pyResp.ok) {
      const text = await pyResp.text();
      throw new Error(`Calc engine error ${pyResp.status}: ${text}`);
    }

    const stepResult = await pyResp.json();

    // 5) Save step output into calc_step_results
    await saveStepResult(client, calc_run_id, 'AFe', stepResult);

    await client.query('COMMIT');
    transactionOpen = false;

    // 6) Return step result to frontend
    return sendApiSuccess(res, 200, stepResult);
  } catch (e) {
    if (transactionOpen) {
      await rollbackQuietly(client);
      transactionOpen = false;
    }
    if (isCalcTransportError(e)) {
      return sendCalcTransportError(res, req.requestId, e);
    }
    return sendApiError(
      res,
      500,
      'BERSN_API_INTERNAL_ERROR',
      'Internal server error.',
      { request_id: req.requestId, reason: String(e.message || e) },
    );
  } finally {
    client.release();
  }
}


// For the EtEUI Calculation

export async function runEtEUI(req, res) {
  const { project_id, calc_run_id, formula_version } = req.body || {};

  const metaError = validateLegacyStepMeta({ project_id, calc_run_id, formula_version });
  if (metaError) {
    return sendApiError(
      res,
      400,
      'BERSN_API_VALIDATION_ERROR',
      metaError,
      { request_id: req.requestId },
    );
  }

  const client = await pool.connect();
  let transactionOpen = false;
  try {
    await client.query('BEGIN');
    transactionOpen = true;

    // 1) Load snapshot for this run
    const snap = await getRunInputSnapshot(client, calc_run_id);
    if (!snap) {
      await rollbackQuietly(client);
      transactionOpen = false;
      return sendApiError(res, 404, 'BERSN_NOT_FOUND', 'calc_run_id not found', { request_id: req.requestId });
    }

    // 2) Validate project match (Option C)
    if (String(snap.project_id) !== String(project_id)) {
      await rollbackQuietly(client);
      transactionOpen = false;
      return sendApiError(
        res,
        400,
        'BERSN_API_VALIDATION_ERROR',
        'project_id does not match calc_run_id',
        { request_id: req.requestId },
      );
    }

    // 3) Load stored inputs (elevators)
    const storedPayload = snap.payload_json || {};
    const storedInputs = storedPayload.inputs || {};
    const elevators = storedInputs.elevators || [];

    if (!Array.isArray(elevators)) {
      await rollbackQuietly(client);
      transactionOpen = false;
      return sendApiError(
        res,
        422,
        'BERSN_INPUT_VALIDATION_ERROR',
        'Stored inputs invalid: elevators must be an array',
        { request_id: req.requestId },
      );
    }

    // 4) Load previous step result: AFe
    const afeStep = await getStepResult(client, calc_run_id, 'AFe');
    const afe = afeStep?.outputs?.AFe;

    if (afe === undefined || afe === null) {
      await rollbackQuietly(client);
      transactionOpen = false;
      return sendApiError(
        res,
        422,
        'BERSN_INPUT_VALIDATION_ERROR',
        'Missing prerequisite step: AFe (run /bersn/formulas/afe first)',
        { request_id: req.requestId },
      );
    }

    // 5) Call Python EtEUI endpoint
    const pyResp = await callCalcWithTimeoutRetry({
      path: '/calc/bersn/formulas/eteui',
      requestId: req.requestId,
      payload: {
        calc_run_id,
        formula_version,
        inputs: {
          AFe: afe,
          elevators,
        },
      },
    });

    if (!pyResp.ok) {
      const text = await pyResp.text();
      throw new Error(`Calc engine error ${pyResp.status}: ${text}`);
    }

    const stepResult = await pyResp.json();

    // 6) Save step output
    await saveStepResult(client, calc_run_id, 'EtEUI', stepResult);

    await client.query('COMMIT');
    transactionOpen = false;
    return sendApiSuccess(res, 200, stepResult);
  } catch (e) {
    if (transactionOpen) {
      await rollbackQuietly(client);
      transactionOpen = false;
    }
    if (isCalcTransportError(e)) {
      return sendCalcTransportError(res, req.requestId, e);
    }
    return sendApiError(
      res,
      500,
      'BERSN_API_INTERNAL_ERROR',
      'Internal server error.',
      { request_id: req.requestId, reason: String(e.message || e) },
    );
  } finally {
    client.release();
  }
}


// For weights formula calculation 

export async function runWeights(req, res) {
  const { project_id, calc_run_id, formula_version } = req.body || {};

  const metaError = validateLegacyStepMeta({ project_id, calc_run_id, formula_version });
  if (metaError) {
    return sendApiError(
      res,
      400,
      'BERSN_API_VALIDATION_ERROR',
      metaError,
      { request_id: req.requestId },
    );
  }

  const client = await pool.connect();
  let transactionOpen = false;
  try {
    await client.query("BEGIN");
    transactionOpen = true;

    // 1) Load snapshot
    const snap = await getRunInputSnapshot(client, calc_run_id);
    if (!snap) {
      await rollbackQuietly(client);
      transactionOpen = false;
      return sendApiError(res, 404, 'BERSN_NOT_FOUND', 'calc_run_id not found', { request_id: req.requestId });
    }

    // 2) Validate project match
    if (String(snap.project_id) !== String(project_id)) {
      await rollbackQuietly(client);
      transactionOpen = false;
      return sendApiError(
        res,
        400,
        'BERSN_API_VALIDATION_ERROR',
        'project_id does not match calc_run_id',
        { request_id: req.requestId },
      );
    }

    // 3) Read required inputs from stored payload
    const storedPayload = snap.payload_json || {};
    const storedInputs = storedPayload.inputs || {};

    const building_code = storedInputs.building_code; // e.g. "A2"
    const operation_mode = storedInputs.operation_mode; // "full_year_ac" | "intermittent_ac"

    if (!building_code) {
      await rollbackQuietly(client);
      transactionOpen = false;
      return sendApiError(res, 422, 'BERSN_INPUT_VALIDATION_ERROR', 'Stored inputs missing: building_code', { request_id: req.requestId });
    }
    if (!operation_mode) {
      await rollbackQuietly(client);
      transactionOpen = false;
      return sendApiError(res, 422, 'BERSN_INPUT_VALIDATION_ERROR', 'Stored inputs missing: operation_mode', { request_id: req.requestId });
    }

    // 4) Load prerequisite: EtEUI
    const eteuiStep = await getStepResult(client, calc_run_id, "EtEUI");
    const EtEUI = eteuiStep?.outputs?.EtEUI;
    if (EtEUI === undefined || EtEUI === null) {
      await rollbackQuietly(client);
      transactionOpen = false;
      return sendApiError(
        res,
        422,
        'BERSN_INPUT_VALIDATION_ERROR',
        'Missing prerequisite step: EtEUI (run /bersn/formulas/eteui first)',
        { request_id: req.requestId },
      );
    }

    // 5) Call Python weights endpoint
    const pyResp = await callCalcWithTimeoutRetry({
      path: '/calc/bersn/formulas/weights',
      requestId: req.requestId,
      payload: {
        calc_run_id,
        formula_version,
        inputs: {
          building_code,
          operation_mode,
          EtEUI,
        },
      },
    });

    if (!pyResp.ok) {
      const text = await pyResp.text();
      throw new Error(`Calc engine error ${pyResp.status}: ${text}`);
    }

    const stepResult = await pyResp.json();

    // 6) Save step output
    await saveStepResult(client, calc_run_id, "WEIGHTS", stepResult);

    await client.query("COMMIT");
    transactionOpen = false;
    return sendApiSuccess(res, 200, stepResult);
  } catch (e) {
    if (transactionOpen) {
      await rollbackQuietly(client);
      transactionOpen = false;
    }
    if (isCalcTransportError(e)) {
      return sendCalcTransportError(res, req.requestId, e);
    }
    return sendApiError(
      res,
      500,
      'BERSN_API_INTERNAL_ERROR',
      'Internal server error.',
      { request_id: req.requestId, reason: String(e.message || e) },
    );
  } finally {
    client.release();
  }
}

// For 3-3-1 general non-residential EEI path (Eq. 3.1~3.6) as a stateless proxy to calc service
export async function runGeneralEEIPath(req, res) {
  const { calc_run_id, formula_version, inputs } = req.body || {};

  // Keep this endpoint lightweight and stateless for development/testing.
  if (!calc_run_id || !formula_version || !inputs) {
    return sendApiError(
      res,
      400,
      'BERSN_API_VALIDATION_ERROR',
      'Missing required fields: calc_run_id, formula_version, inputs',
      { request_id: req.requestId },
    );
  }

  const calcRunIdError = validateIdentifier(calc_run_id, 'calc_run_id');
  if (calcRunIdError) {
    return sendApiError(res, 400, 'BERSN_API_VALIDATION_ERROR', calcRunIdError, { request_id: req.requestId });
  }
  const formulaVersionError = validateFormulaVersion(formula_version);
  if (formulaVersionError) {
    return sendApiError(res, 400, 'BERSN_API_VALIDATION_ERROR', formulaVersionError, { request_id: req.requestId });
  }
  const inputsEnvelopeError = validateInputsEnvelope(inputs);
  if (inputsEnvelopeError) {
    return sendApiError(res, 400, 'BERSN_API_VALIDATION_ERROR', inputsEnvelopeError, { request_id: req.requestId });
  }
  const profileError = validateFormulaInputsByProfile('/calc/bersn/formulas/general-eei', inputs);
  if (profileError) {
    return sendApiError(res, 400, 'BERSN_API_VALIDATION_ERROR', profileError, { request_id: req.requestId });
  }

  try {
    const pyResp = await callCalcWithTimeoutRetry({
      path: '/calc/bersn/formulas/general-eei',
      requestId: req.requestId,
      payload: {
        calc_run_id,
        formula_version,
        inputs,
      },
    });

    if (!pyResp.ok) {
      const parsed = await parseCalcErrorResponse(pyResp);
      const normalizedParsed = normalizeCalcErrorPayload(parsed);
      return sendApiError(
        res,
        pyResp.status,
        'CALC_ENGINE_VALIDATION_ERROR',
        'Calc engine request failed.',
        { request_id: req.requestId, calc_status: pyResp.status, calc_response: normalizedParsed },
      );
    }

    const result = await pyResp.json();
    return sendApiSuccess(res, 200, result);
  } catch (e) {
    if (isCalcTransportError(e)) {
      return sendCalcTransportError(res, req.requestId, e);
    }
    return sendApiError(
      res,
      500,
      'BERSN_API_INTERNAL_ERROR',
      'Internal server error.',
      { request_id: req.requestId, reason: String(e.message || e) },
    );
  }
}

// Helper: run a calc formula endpoint and persist the step result in DB.
async function runAndStoreFormulaStep(req, res, config) {
  const { stepName, calcPath } = config;
  const { project_id, calc_run_id, formula_version, inputs } = req.body || {};

  if (!project_id || !calc_run_id || !formula_version || !inputs) {
    return sendApiError(
      res,
      400,
      'BERSN_API_VALIDATION_ERROR',
      'Missing required fields: project_id, calc_run_id, formula_version, inputs',
      { request_id: req.requestId },
    );
  }

  const projectValidationError = validateIdentifier(project_id, 'project_id');
  if (projectValidationError) {
    return sendApiError(res, 400, 'BERSN_API_VALIDATION_ERROR', projectValidationError, { request_id: req.requestId });
  }
  const calcRunIdError = validateIdentifier(calc_run_id, 'calc_run_id');
  if (calcRunIdError) {
    return sendApiError(res, 400, 'BERSN_API_VALIDATION_ERROR', calcRunIdError, { request_id: req.requestId });
  }
  const formulaVersionError = validateFormulaVersion(formula_version);
  if (formulaVersionError) {
    return sendApiError(res, 400, 'BERSN_API_VALIDATION_ERROR', formulaVersionError, { request_id: req.requestId });
  }
  const inputsEnvelopeError = validateInputsEnvelope(inputs);
  if (inputsEnvelopeError) {
    return sendApiError(res, 400, 'BERSN_API_VALIDATION_ERROR', inputsEnvelopeError, { request_id: req.requestId });
  }
  const client = await pool.connect();
  let transactionOpen = false;
  try {
    await client.query("BEGIN");
    transactionOpen = true;

    // Ensure calc_run exists and belongs to project.
    const snap = await getRunInputSnapshot(client, calc_run_id);
    if (!snap) {
      await rollbackQuietly(client);
      transactionOpen = false;
      return sendApiError(res, 404, 'BERSN_NOT_FOUND', 'calc_run_id not found', { request_id: req.requestId });
    }
    if (String(snap.project_id) !== String(project_id)) {
      await rollbackQuietly(client);
      transactionOpen = false;
      return sendApiError(
        res,
        400,
        'BERSN_API_VALIDATION_ERROR',
        'project_id does not match calc_run_id',
        { request_id: req.requestId },
      );
    }

    let calcInputs = inputs;
    if (shouldInjectManagedBeta1(calcPath, inputs)) {
      const managed = await applyManagedBeta1ToInputs(client, inputs);
      calcInputs = managed.inputs;
    }

    const profileError = validateFormulaInputsByProfile(calcPath, calcInputs);
    if (profileError) {
      await rollbackQuietly(client);
      transactionOpen = false;
      return sendApiError(res, 400, 'BERSN_API_VALIDATION_ERROR', profileError, { request_id: req.requestId });
    }

    // Call Python calc formula endpoint.
    const pyResp = await callCalcWithTimeoutRetry({
      path: calcPath,
      requestId: req.requestId,
      payload: {
        calc_run_id,
        formula_version,
        inputs: calcInputs,
      },
    });

    if (!pyResp.ok) {
      const parsed = await parseCalcErrorResponse(pyResp);
      const normalizedParsed = normalizeCalcErrorPayload(parsed);
      await rollbackQuietly(client);
      transactionOpen = false;
      return sendApiError(
        res,
        pyResp.status,
        'CALC_ENGINE_VALIDATION_ERROR',
        'Calc engine request failed.',
        {
          request_id: req.requestId,
          calc_status: pyResp.status,
          calc_response: normalizedParsed,
        },
      );
    }

    const stepResult = await pyResp.json();

    // Persist both request inputs and calc output/trace for reproducibility.
    // This is the key per-step audit artifact used by review/report pages.
    await saveStepResult(client, calc_run_id, stepName, {
      request_inputs: calcInputs,
      response: stepResult,
    });

    await client.query("COMMIT");
    transactionOpen = false;
    if (shouldInjectManagedBeta1(calcPath, inputs)) {
      scheduleBeta1Verification(req.requestId);
    }
    return sendApiSuccess(res, 200, stepResult);
  } catch (e) {
    if (transactionOpen) {
      await rollbackQuietly(client);
      transactionOpen = false;
    }
    if (isCalcTransportError(e)) {
      return sendCalcTransportError(res, req.requestId, e);
    }
    return sendApiError(
      res,
      500,
      'BERSN_API_INTERNAL_ERROR',
      'Internal server error.',
      { request_id: req.requestId, reason: String(e.message || e) },
    );
  } finally {
    client.release();
  }
}

// DB-backed: 3-2-2 preprocessing (EEV/EAC/EL)
export async function runPreprocessEfficiency(req, res) {
  return runAndStoreFormulaStep(req, res, {
    stepName: "PREPROCESS_EFFICIENCY",
    calcPath: "/calc/bersn/formulas/preprocess-efficiency",
  });
}

// DB-backed: Eq. 3.6 EEI (general branch, no hot water)
export async function runEEIGeneral(req, res) {
  return runAndStoreFormulaStep(req, res, {
    stepName: "EEI_GENERAL",
    calcPath: "/calc/bersn/formulas/eei-general",
  });
}

// DB-backed: 3-4 SCOREEE (Eq. 3.16a / 3.16b)
export async function runScoreGeneral(req, res) {
  return runAndStoreFormulaStep(req, res, {
    stepName: "SCORE_GENERAL",
    calcPath: "/calc/bersn/formulas/score-general",
  });
}

// DB-backed: 3-5 scale values (Eq. 3.17~3.20)
export async function runScaleValuesGeneral(req, res) {
  return runAndStoreFormulaStep(req, res, {
    stepName: "SCALE_VALUES_GENERAL",
    calcPath: "/calc/bersn/formulas/scale-values-general",
  });
}

// DB-backed: 3-6 indicators (Eq. 3.21~3.24)
export async function runIndicatorsGeneral(req, res) {
  return runAndStoreFormulaStep(req, res, {
    stepName: "INDICATORS_GENERAL",
    calcPath: "/calc/bersn/formulas/indicators-general",
  });
}

// DB-backed: 3-7 grade mapping (Table 3.4)
export async function runGradeGeneral(req, res) {
  return runAndStoreFormulaStep(req, res, {
    stepName: "GRADE_GENERAL",
    calcPath: "/calc/bersn/formulas/grade-general",
  });
}

// DB-backed: end-to-end general branch (3-2-1 -> 3-7)
export async function runGeneralFull(req, res) {
  return runAndStoreFormulaStep(req, res, {
    stepName: "GENERAL_FULL",
    calcPath: "/calc/bersn/formulas/general-full",
  });
}

// DB-backed: Appendix 2 EAC
export async function runEAC(req, res) {
  return runAndStoreFormulaStep(req, res, {
    stepName: "EAC",
    calcPath: "/calc/bersn/formulas/eac",
  });
}

// DB-backed: Appendix 2 EL
export async function runEL(req, res) {
  return runAndStoreFormulaStep(req, res, {
    stepName: "EL",
    calcPath: "/calc/bersn/formulas/el",
  });
}

// DB-backed: hot-water preprocess (Eq. 3.7~3.10)
export async function runHotwaterPreprocess(req, res) {
  return runAndStoreFormulaStep(req, res, {
    stepName: "HOTWATER_PREPROCESS",
    calcPath: "/calc/bersn/formulas/hotwater-preprocess",
  });
}

// DB-backed: end-to-end hot-water branch (3-2-1 -> 3-7 with 3-3-2)
export async function runHotwaterFull(req, res) {
  return runAndStoreFormulaStep(req, res, {
    stepName: "HOTWATER_FULL",
    calcPath: "/calc/bersn/formulas/hotwater-full",
  });
}

// DB-backed: renewable preprocess (Table 3.5 GE/PV-equivalent/Rs)
export async function runRenewablePreprocess(req, res) {
  return runAndStoreFormulaStep(req, res, {
    stepName: "RENEWABLE_PREPROCESS",
    calcPath: "/calc/bersn/formulas/renewable-preprocess",
  });
}

// DB-backed: renewable bonus apply (Eq. 3.25/3.26 or Eq. 3.27 + cap)
export async function runRenewableBonus(req, res) {
  return runAndStoreFormulaStep(req, res, {
    stepName: "RENEWABLE_BONUS",
    calcPath: "/calc/bersn/formulas/renewable-bonus",
  });
}

// DB-backed: NZB eligibility gate (3-9 rule #1)
export async function runNZBEligibility(req, res) {
  return runAndStoreFormulaStep(req, res, {
    stepName: "NZB_ELIGIBILITY",
    calcPath: "/calc/bersn/formulas/nzb-eligibility",
  });
}

// DB-backed: NZB TE/TGE balance (3-9 rule #2)
export async function runNZBBalance(req, res) {
  return runAndStoreFormulaStep(req, res, {
    stepName: "NZB_BALANCE",
    calcPath: "/calc/bersn/formulas/nzb-balance",
  });
}

// DB-backed: NZB final evaluation (3-9)
export async function runNZBEvaluate(req, res) {
  return runAndStoreFormulaStep(req, res, {
    stepName: "NZB_EVALUATE",
    calcPath: "/calc/bersn/formulas/nzb-evaluate",
  });
}

//Get the data for the front end. The formulas are 
export async function getRunDetails(req, res) {
  const calcRunId = req.params.calc_run_id;

  if (!calcRunId) {
    return sendApiError(res, 400, 'BERSN_API_VALIDATION_ERROR', 'Missing calc_run_id', { request_id: req.requestId });
  }

  const client = await pool.connect();
  try {
    const data = await getRunWithSteps(client, calcRunId);
    if (!data) return sendApiError(res, 404, 'BERSN_NOT_FOUND', 'calc_run_id not found', { request_id: req.requestId });

    // Shape expected by frontend:
    // { calc_run_id, payload_json, steps, ...metadata }
    return sendApiSuccess(res, 200, data);
  } catch (e) {
    return sendApiError(
      res,
      500,
      'BERSN_API_INTERNAL_ERROR',
      'Internal server error.',
      { request_id: req.requestId, reason: String(e.message || e) },
    );
  } finally {
    client.release();
  }
}
