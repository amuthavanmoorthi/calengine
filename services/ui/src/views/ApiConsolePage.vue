<template>
  <main class="page-shell wide">
    <section class="card">
      <header class="top-row">
        <div>
          <p class="eyebrow">BERSn Calculation System - Phase 1</p>
          <h1>API Console</h1>
          <p class="version">All backend endpoints (including login)</p>
        </div>
        <div class="action-group">
          <button class="btn-secondary" @click="navigate('/dashboard')">Back Dashboard</button>
          <button class="btn-secondary" @click="navigate('/calculation')">Calculation</button>
        </div>
      </header>

      <div class="panel">
        <div class="field-grid">
          <label class="field">
            <span>Endpoint</span>
            <select v-model="selectedKey" @change="onEndpointChange">
              <option v-for="e in endpoints" :key="e.key" :value="e.key">
                {{ e.method }} {{ e.path }}
              </option>
            </select>
          </label>

          <label class="field" v-if="selected?.path.includes('{calc_run_id}')">
            <span>calc_run_id</span>
            <input v-model="runIdForPath" type="text" />
          </label>
        </div>

        <label class="field">
          <span>Request Body (JSON)</span>
          <textarea class="json-area" v-model="bodyText" />
        </label>

        <button class="btn-primary" :disabled="loading" @click="runEndpoint">
          {{ loading ? 'Running...' : 'Run Endpoint' }}
        </button>
        <p v-if="error" class="error">{{ error }}</p>
      </div>

      <div class="panel" v-if="responseText">
        <h2>Response</h2>
        <p>Status: <strong>{{ responseStatus }}</strong></p>
        <pre class="trace-json">{{ responseText }}</pre>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { navigate } from '../nav';

// Frontend -> API URL by environment:
// - Development UI (local Vite frontend): use `http://localhost:8080`
// - Testing UI (Zeabur frontend): `.env.production` sets `VITE_API_URL=https://calengine-api.zeabur.app`
// - Production UI: set `VITE_API_URL` to the future production API URL
const API_BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) || 'http://localhost:8080';
const PROJECT_ID = '11111111-1111-1111-1111-111111111111';
const FORMULA_VERSION = 'v1.0';

const seedRunInputs = {
  E_design: 1000,
  E_baseline: 1200,
  AF: 12000,
  excluded_zones: [{ type: 'indoor_parking', area_m2: 1800 }],
  elevators: [{ Nej: 4, Eelj: 8.24, YOHj: 2500 }],
  building_code: 'G2',
  operation_mode: 'full_year_ac',
} as const;

const generalInputs = {
  AF: 12000,
  excluded_zones: [{ type: 'indoor_parking', area_m2: 1800 }],
  elevators: [{ Nej: 4, Eelj: 8.24, YOHj: 2500 }],
  AEUI: 42.4,
  LEUI: 20,
  EEUI: 6,
  UR: 1,
  EEV: 0.85,
  EAC: 0.72,
  EL: 0.65,
  Es: 0.05,
  Et: 0.5,
  beta1: 0.494,
  CFn: 0.91,
} as const;

const hotwaterInputs = {
  ...generalInputs,
  hotwater_category: 'hotel',
  hotwater_system_type: 'electric_storage',
  NPi: 300,
} as const;

const scaleValues = {
  EUIn: 39.62352941176471,
  EUIg: 59.797647058823536,
  EUIm: 73.24705882352941,
  EUImax: 140.49411764705883,
} as const;

type EndpointDef = {
  key: string;
  method: 'GET' | 'POST';
  path: string;
  sample: Record<string, unknown> | null;
  needsCalcRun?: boolean;
};

const endpoints: EndpointDef[] = [
  { key: 'health', method: 'GET', path: '/health', sample: null },
  { key: 'ready', method: 'GET', path: '/ready', sample: null },
  { key: 'authLogin', method: 'POST', path: '/api/auth/login', sample: { username: 'agency_test', password: 'phase1_demo' } },
  {
    key: 'normalize',
    method: 'POST',
    path: '/api/bersn/classification/normalize',
    sample: {
      total_above_ground_floor_area_m2: 12000,
      segments: [{ appendix1_code: 'G2', table_3_2_label: 'G-2 辦公場所', display_name: 'Office', area_m2: 12000, operation_mode: 'all_year', urban_zone: 'A' }],
    },
  },
  {
    key: 'runCalc',
    method: 'POST',
    path: '/api/bersn/calc',
    sample: {
      project_id: PROJECT_ID,
      branch_type: 'WITHOUT_HOT_WATER',
      formula_version: FORMULA_VERSION,
      inputs: {
        ...generalInputs,
        building_code: 'G2',
        operation_mode: 'full_year_ac',
      },
    },
  },
  {
    key: 'afe',
    method: 'POST',
    path: '/api/bersn/formulas/afe',
    sample: { project_id: PROJECT_ID, calc_run_id: '{{calc_run_id}}', formula_version: FORMULA_VERSION, inputs: {} },
    needsCalcRun: true,
  },
  {
    key: 'eteui',
    method: 'POST',
    path: '/api/bersn/formulas/eteui',
    sample: { project_id: PROJECT_ID, calc_run_id: '{{calc_run_id}}', formula_version: FORMULA_VERSION, inputs: {} },
    needsCalcRun: true,
  },
  {
    key: 'weights',
    method: 'POST',
    path: '/api/bersn/formulas/weights',
    sample: { project_id: PROJECT_ID, calc_run_id: '{{calc_run_id}}', formula_version: FORMULA_VERSION, inputs: {} },
    needsCalcRun: true,
  },
  {
    key: 'generalEEIPath',
    method: 'POST',
    path: '/api/bersn/formulas/general-eei',
    sample: { calc_run_id: 'console-general-eei', formula_version: FORMULA_VERSION, inputs: generalInputs },
  },
  {
    key: 'preprocess',
    method: 'POST',
    path: '/api/bersn/formulas/preprocess-efficiency',
    sample: {
      project_id: PROJECT_ID,
      calc_run_id: '{{calc_run_id}}',
      formula_version: FORMULA_VERSION,
      inputs: {
        EEV: 0.85,
        eac_method: 'central_le_50',
        BW: 1,
        EE: 0.29,
        HT: 1,
        INAC: 1,
        el_numerator_total: 17274,
        el_denominator_total: 35100,
      },
    },
    needsCalcRun: true,
  },
  {
    key: 'eeiGeneral',
    method: 'POST',
    path: '/api/bersn/formulas/eei-general',
    sample: { project_id: PROJECT_ID, calc_run_id: '{{calc_run_id}}', formula_version: FORMULA_VERSION, inputs: { a: 0.6305108467459761, b: 0.2974107767669699, c: 0.07207837648705387, EAC: 0.72, EEV: 0.85, Es: 0.05, EL: 0.65, Et: 0.5 } },
    needsCalcRun: true,
  },
  {
    key: 'scoreGeneral',
    method: 'POST',
    path: '/api/bersn/formulas/score-general',
    sample: { project_id: PROJECT_ID, calc_run_id: '{{calc_run_id}}', formula_version: FORMULA_VERSION, inputs: { EEI: 0.6565272918124562 } },
    needsCalcRun: true,
  },
  {
    key: 'scaleValues',
    method: 'POST',
    path: '/api/bersn/formulas/scale-values-general',
    sample: { project_id: PROJECT_ID, calc_run_id: '{{calc_run_id}}', formula_version: FORMULA_VERSION, inputs: { AEUI: 42.4, LEUI: 20, EEUI: 6, EtEUI: 4.847058823529411, UR: 1 } },
    needsCalcRun: true,
  },
  {
    key: 'indicators',
    method: 'POST',
    path: '/api/bersn/formulas/indicators-general',
    sample: { project_id: PROJECT_ID, calc_run_id: '{{calc_run_id}}', formula_version: FORMULA_VERSION, inputs: { SCOREEE: 69.12969442500585, ...scaleValues, beta1: 0.494, CFn: 0.91 } },
    needsCalcRun: true,
  },
  {
    key: 'grade',
    method: 'POST',
    path: '/api/bersn/formulas/grade-general',
    sample: { project_id: PROJECT_ID, calc_run_id: '{{calc_run_id}}', formula_version: FORMULA_VERSION, inputs: { SCOREEE: 69.12969442500585, EUI_star: 50.1495294117647, EUIn: scaleValues.EUIn, EUIg: scaleValues.EUIg, EUImax: scaleValues.EUImax } },
    needsCalcRun: true,
  },
  {
    key: 'generalFull',
    method: 'POST',
    path: '/api/bersn/formulas/general-full',
    sample: { project_id: PROJECT_ID, calc_run_id: '{{calc_run_id}}', formula_version: FORMULA_VERSION, inputs: generalInputs },
    needsCalcRun: true,
  },
  {
    key: 'eac',
    method: 'POST',
    path: '/api/bersn/formulas/eac',
    sample: { project_id: PROJECT_ID, calc_run_id: '{{calc_run_id}}', formula_version: FORMULA_VERSION, inputs: { eac_method: 'central_le_50', BW: 1, EE: 0.29, HT: 1, INAC: 1 } },
    needsCalcRun: true,
  },
  {
    key: 'el',
    method: 'POST',
    path: '/api/bersn/formulas/el',
    sample: { project_id: PROJECT_ID, calc_run_id: '{{calc_run_id}}', formula_version: FORMULA_VERSION, inputs: { el_numerator_total: 17274, el_denominator_total: 35100 } },
    needsCalcRun: true,
  },
  {
    key: 'hotwaterPre',
    method: 'POST',
    path: '/api/bersn/formulas/hotwater-preprocess',
    sample: { project_id: PROJECT_ID, calc_run_id: '{{calc_run_id}}', formula_version: FORMULA_VERSION, inputs: { AFe: 10200, hotwater_category: 'hotel', hotwater_system_type: 'electric_storage', NPi: 300 } },
    needsCalcRun: true,
  },
  {
    key: 'hotwaterFull',
    method: 'POST',
    path: '/api/bersn/formulas/hotwater-full',
    sample: { project_id: PROJECT_ID, calc_run_id: '{{calc_run_id}}', formula_version: FORMULA_VERSION, inputs: hotwaterInputs },
    needsCalcRun: true,
  },
  {
    key: 'renewPre',
    method: 'POST',
    path: '/api/bersn/formulas/renewable-preprocess',
    sample: { project_id: PROJECT_ID, calc_run_id: '{{calc_run_id}}', formula_version: FORMULA_VERSION, inputs: { renewable_type: 'pv', T: 1, pv_max_generation_efficiency_kwh_per_kw_day: 3.55, PV_installed_capacity_kW: 100 } },
    needsCalcRun: true,
  },
  {
    key: 'renewBonus',
    method: 'POST',
    path: '/api/bersn/formulas/renewable-bonus',
    sample: { project_id: PROJECT_ID, calc_run_id: '{{calc_run_id}}', formula_version: FORMULA_VERSION, inputs: { method: 'pv_area_method', SCOREEE_before: 67.85, Rs: 0.3, T: 1 } },
    needsCalcRun: true,
  },
  {
    key: 'nzbElig',
    method: 'POST',
    path: '/api/bersn/formulas/nzb-eligibility',
    sample: { project_id: PROJECT_ID, calc_run_id: '{{calc_run_id}}', formula_version: FORMULA_VERSION, inputs: { grade: '1+' } },
    needsCalcRun: true,
  },
  {
    key: 'nzbBalance',
    method: 'POST',
    path: '/api/bersn/formulas/nzb-balance',
    sample: { project_id: PROJECT_ID, calc_run_id: '{{calc_run_id}}', formula_version: FORMULA_VERSION, inputs: { TEUI: 55.1, AFe: 10200, TGE: 600000 } },
    needsCalcRun: true,
  },
  {
    key: 'nzbEvaluate',
    method: 'POST',
    path: '/api/bersn/formulas/nzb-evaluate',
    sample: { project_id: PROJECT_ID, calc_run_id: '{{calc_run_id}}', formula_version: FORMULA_VERSION, inputs: { grade: '1+', TEUI: 55.1, AFe: 10200, TGE: 600000 } },
    needsCalcRun: true,
  },
  { key: 'runDetails', method: 'GET', path: '/api/bersn/runs/{calc_run_id}', sample: null },
];

const prerequisiteMap: Record<string, string[]> = {
  eteui: ['afe'],
  weights: ['afe', 'eteui'],
};

const defaultEndpoint = endpoints[0] as EndpointDef;
const selectedKey = ref(defaultEndpoint.key);
const runIdForPath = ref('');
const lastCalcRunId = ref('');
const bodyText = ref('');
const responseText = ref('');
const responseStatus = ref('-');
const error = ref('');
const loading = ref(false);

const selected = computed<EndpointDef>(() => endpoints.find((e) => e.key === selectedKey.value) || defaultEndpoint);

function cloneSample<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function injectCalcRunPlaceholder(value: unknown, calcRunId: string): unknown {
  if (typeof value === 'string') {
    return value === '{{calc_run_id}}' ? calcRunId : value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => injectCalcRunPlaceholder(item, calcRunId));
  }
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>).map(([key, item]) => [key, injectCalcRunPlaceholder(item, calcRunId)]),
    );
  }
  return value;
}

function getDisplayedCalcRunId() {
  return runIdForPath.value.trim() || lastCalcRunId.value.trim() || 'console-run-001';
}

function setBodyFromSample() {
  if (!selected.value.sample) {
    bodyText.value = '';
    return;
  }
  const hydrated = injectCalcRunPlaceholder(cloneSample(selected.value.sample), getDisplayedCalcRunId());
  bodyText.value = JSON.stringify(hydrated, null, 2);
}

function onEndpointChange() {
  if (!runIdForPath.value && lastCalcRunId.value) {
    runIdForPath.value = lastCalcRunId.value;
  }
  setBodyFromSample();
  responseText.value = '';
  error.value = '';
}

function resolvePath(path: string): string {
  return path.includes('{calc_run_id}')
    ? path.replace('{calc_run_id}', encodeURIComponent(getDisplayedCalcRunId()))
    : path;
}

async function parseResponse(response: Response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

async function createSeedRun() {
  const branchType = selected.value.key === 'hotwaterFull' || selected.value.key === 'hotwaterPre' ? 'WITH_HOT_WATER' : 'WITHOUT_HOT_WATER';
  const payload = {
    project_id: PROJECT_ID,
    branch_type: branchType,
    formula_version: FORMULA_VERSION,
    inputs: seedRunInputs,
  };
  const response = await fetch(`${API_BASE_URL}/api/bersn/calc`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const parsed = await parseResponse(response);
  if (!response.ok) {
    throw new Error(`Failed to create calc run: ${parsed.message || response.statusText}`);
  }
  const calcRunId = parsed.calc_run_id || parsed.outputs?.calc_run_id;
  if (typeof calcRunId !== 'string' || calcRunId.trim().length === 0) {
    throw new Error('Calc run creation did not return calc_run_id');
  }
  lastCalcRunId.value = calcRunId;
  runIdForPath.value = calcRunId;
  return calcRunId;
}

async function ensureSeedRun() {
  if (lastCalcRunId.value.trim()) return lastCalcRunId.value.trim();
  return createSeedRun();
}

async function postJson(path: string, body: Record<string, unknown>) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const parsed = await parseResponse(response);
  if (!response.ok) {
    throw new Error(`${path} failed: ${parsed.message || response.statusText}`);
  }
  return parsed;
}

async function ensurePrerequisites(calcRunId: string) {
  const prereqs = prerequisiteMap[selected.value.key] || [];
  for (const key of prereqs) {
    const endpoint = endpoints.find((item) => item.key === key);
    if (!endpoint || !endpoint.sample) continue;
    const payload = injectCalcRunPlaceholder(cloneSample(endpoint.sample), calcRunId) as Record<string, unknown>;
    await postJson(endpoint.path, payload);
  }
}

function normalizeRequestBody(rawBody: Record<string, unknown>, calcRunId: string) {
  const normalized = injectCalcRunPlaceholder(cloneSample(rawBody), calcRunId) as Record<string, unknown>;
  if (selected.value.needsCalcRun) {
    normalized.project_id = PROJECT_ID;
    normalized.calc_run_id = calcRunId;
    normalized.formula_version = FORMULA_VERSION;
  }
  return normalized;
}

async function runEndpoint() {
  loading.value = true;
  error.value = '';
  responseText.value = '';
  try {
    const path = resolvePath(selected.value.path);
    let response: Response;

    if (selected.value.method === 'GET') {
      response = await fetch(`${API_BASE_URL}${path}`);
    } else {
      const rawBody = bodyText.value.trim() ? JSON.parse(bodyText.value) : {};
      const calcRunId = selected.value.needsCalcRun ? await ensureSeedRun() : getDisplayedCalcRunId();
      if (selected.value.needsCalcRun) {
        await ensurePrerequisites(calcRunId);
      }
      const body = normalizeRequestBody(rawBody as Record<string, unknown>, calcRunId);
      bodyText.value = JSON.stringify(body, null, 2);
      response = await fetch(`${API_BASE_URL}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    }

    responseStatus.value = `${response.status} ${response.statusText}`;
    const parsed = await parseResponse(response);
    if (selected.value.key === 'runCalc' && response.ok) {
      const calcRunId = parsed.calc_run_id || parsed.outputs?.calc_run_id;
      if (typeof calcRunId === 'string' && calcRunId.trim().length > 0) {
        lastCalcRunId.value = calcRunId;
        runIdForPath.value = calcRunId;
      }
    }
    responseText.value = JSON.stringify(parsed, null, 2);
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Request failed';
  } finally {
    loading.value = false;
  }
}

onEndpointChange();
</script>
