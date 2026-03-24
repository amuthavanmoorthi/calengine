import crypto from 'crypto';
import {
  pool,
  getSystemParameter,
  upsertSystemParameter,
  touchSystemParameterVerification,
  insertSystemParameterHistory,
} from '../models/systemParameterModel.js';

const BETA1_KEY = 'beta1';
const BETA1_UNIT = 'kgCO2e/kWh';
const BETA1_DEFAULT = Number(process.env.BETA1_DEFAULT || 0.474);
const BETA1_SOURCE_URL = process.env.BETA1_SOURCE_URL || 'https://www.moeaea.gov.tw/ecw/populace/content/ContentDesc.aspx?menu_id=26678';
const BETA1_SOURCE_AUTHORITY = process.env.BETA1_SOURCE_AUTHORITY || 'MOEAEA';
const BETA1_VERIFY_TTL_HOURS = Number(process.env.BETA1_VERIFY_TTL_HOURS || 24);
const BETA1_VERIFY_TIMEOUT_MS = Number(process.env.BETA1_VERIFY_TIMEOUT_MS || 8000);
const BETA1_AUTO_APPLY = String(process.env.BETA1_AUTO_APPLY || 'true').toLowerCase() !== 'false';

const MANAGED_BETA1_CALC_PATHS = new Set([
  '/calc/bersn/formulas/indicators-general',
  '/calc/bersn/formulas/general-full',
  '/calc/bersn/formulas/hotwater-full',
  '/calc/bersn/formulas/renewable-preprocess',
]);

let verificationPromise = null;

function isMissingTableError(err) {
  return err?.code === '42P01';
}

function normalizeFinitePositive(value, fallback) {
  const numeric = Number(value);
  if (Number.isFinite(numeric) && numeric > 0) return numeric;
  return fallback;
}

function buildBootstrapParameter() {
  return {
    key: BETA1_KEY,
    numericValue: BETA1_DEFAULT,
    unit: BETA1_UNIT,
    sourceAuthority: BETA1_SOURCE_AUTHORITY,
    sourceUrl: null,
    sourceNote: 'Bootstrap beta1 default (113年度電力排碳係數 managed fallback value)',
    effectiveYear: 113,
    status: 'ACTIVE',
    autoManaged: true,
    lastVerifiedAt: null,
  };
}

function parseEffectiveYear(html) {
  const yearMatch = html.match(/([0-9]{3})年度電力排碳係數/);
  return yearMatch ? Number(yearMatch[1]) : null;
}

function parseOfficialBeta1(html) {
  const patterns = [
    /電力排碳係數[\s\S]{0,300}?([0-9]\.[0-9]{3})\s*(?:公斤|kg)\s*CO2e?\s*\/\s*(?:度|kWh)/i,
    /([0-9]\.[0-9]{3})\s*(?:公斤|kg)\s*CO2e?\s*\/\s*(?:度|kWh)/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    if (!match) continue;
    const value = Number(match[1]);
    if (Number.isFinite(value) && value > 0 && value < 2) {
      const effectiveYear = parseEffectiveYear(html);
      return {
        value,
        effectiveYear,
        sourceNote: effectiveYear ? `${effectiveYear}年度電力排碳係數` : 'Official electricity carbon-emission factor',
      };
    }
  }

  throw new Error('Unable to parse beta1 from official source');
}

function beta1ValueChanged(oldValue, newValue) {
  return Math.abs(Number(oldValue) - Number(newValue)) > 1e-9;
}

function shouldVerify(row) {
  if (!row?.last_verified_at) return true;
  const lastVerifiedMs = new Date(row.last_verified_at).getTime();
  const ttlMs = BETA1_VERIFY_TTL_HOURS * 60 * 60 * 1000;
  return Number.isFinite(lastVerifiedMs) && (Date.now() - lastVerifiedMs) >= ttlMs;
}

async function ensureManagedBeta1Record(clientOrPool) {
  try {
    let row = await getSystemParameter(clientOrPool, BETA1_KEY);
    if (row && Number.isFinite(Number(row.numeric_value)) && Number(row.numeric_value) > 0) {
      return {
        value: Number(row.numeric_value),
        row,
        managed: true,
      };
    }

    row = await upsertSystemParameter(clientOrPool, buildBootstrapParameter());
    return {
      value: normalizeFinitePositive(row?.numeric_value, BETA1_DEFAULT),
      row,
      managed: true,
    };
  } catch (err) {
    if (isMissingTableError(err)) {
      console.warn('[beta1] system parameter tables are missing; using fallback default');
      return {
        value: BETA1_DEFAULT,
        row: null,
        managed: false,
      };
    }

    console.warn('[beta1] failed to read managed beta1; using fallback default', {
      reason: String(err?.message || err),
    });
    return {
      value: BETA1_DEFAULT,
      row: null,
      managed: false,
    };
  }
}

async function fetchOfficialBeta1() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), BETA1_VERIFY_TIMEOUT_MS);
  try {
    const resp = await fetch(BETA1_SOURCE_URL, {
      method: 'GET',
      headers: { 'user-agent': 'BERSn-API beta1 verifier' },
      signal: controller.signal,
    });
    if (!resp.ok) {
      throw new Error(`Official source returned ${resp.status}`);
    }
    const html = await resp.text();
    return parseOfficialBeta1(html);
  } finally {
    clearTimeout(timeout);
  }
}

async function verifyAndRefreshBeta1(requestId) {
  const current = await ensureManagedBeta1Record(pool);
  if (!current.managed) return;
  if (!shouldVerify(current.row)) return;

  const latest = await fetchOfficialBeta1();
  const verifiedAt = new Date();

  if (!BETA1_AUTO_APPLY) {
    await touchSystemParameterVerification(pool, BETA1_KEY, verifiedAt);
    console.info('[beta1] verification completed (auto-apply disabled)', {
      request_id: requestId,
      current_value: current.value,
      detected_value: latest.value,
    });
    return;
  }

  if (!beta1ValueChanged(current.value, latest.value)) {
    await touchSystemParameterVerification(pool, BETA1_KEY, verifiedAt);
    return;
  }

  const updated = await upsertSystemParameter(pool, {
    key: BETA1_KEY,
    numericValue: latest.value,
    unit: BETA1_UNIT,
    sourceAuthority: BETA1_SOURCE_AUTHORITY,
    sourceUrl: BETA1_SOURCE_URL,
    sourceNote: latest.sourceNote,
    effectiveYear: latest.effectiveYear,
    status: 'ACTIVE',
    autoManaged: true,
    lastVerifiedAt: verifiedAt,
  });

  await insertSystemParameterHistory(pool, {
    id: crypto.randomUUID(),
    key: BETA1_KEY,
    oldNumericValue: current.value,
    newNumericValue: latest.value,
    unit: BETA1_UNIT,
    sourceAuthority: BETA1_SOURCE_AUTHORITY,
    sourceUrl: BETA1_SOURCE_URL,
    sourceNote: latest.sourceNote,
    effectiveYear: latest.effectiveYear,
    changeReason: 'official_source_refresh',
  });

  console.info('[beta1] updated from official source', {
    request_id: requestId,
    previous_value: current.value,
    new_value: updated?.numeric_value ?? latest.value,
    effective_year: latest.effectiveYear,
  });
}

export function shouldInjectManagedBeta1(calcPath, inputs) {
  return MANAGED_BETA1_CALC_PATHS.has(calcPath) || Object.prototype.hasOwnProperty.call(inputs || {}, 'beta1');
}

export async function applyManagedBeta1ToInputs(clientOrPool, inputs) {
  const current = await ensureManagedBeta1Record(clientOrPool);
  return {
    inputs: {
      ...(inputs || {}),
      beta1: current.value,
    },
    beta1: current.value,
    managed: current.managed,
  };
}

export function scheduleBeta1Verification(requestId) {
  if (verificationPromise) return;
  verificationPromise = verifyAndRefreshBeta1(requestId)
    .catch((err) => {
      console.warn('[beta1] verification failed', {
        request_id: requestId,
        reason: String(err?.message || err),
      });
    })
    .finally(() => {
      verificationPromise = null;
    });
}
