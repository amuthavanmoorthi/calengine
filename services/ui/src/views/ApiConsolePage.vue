<template>
  <main class="api-console-page">
    <section class="api-console-shell">
      <header class="console-topbar">
        <div class="title-block">
          <h1>{{ t('執行單一公式', 'Run Individual Equation') }}</h1>
          <p>{{ t('即時測試與檢查後端計算端點。', 'Test and debug backend calculation endpoints in real-time.') }}</p>
        </div>

        <div class="console-toolbar">
          <div class="console-toolbar__group">
            <button class="console-link" @click="navigate('/dashboard')">{{ t('返回儀表板', 'Back Dashboard') }}</button>
            <button class="console-link" @click="navigate('/calculation')">{{ t('計算頁面', 'Calculation') }}</button>
          </div>
          <LanguageToggle />
          <div class="console-avatar">U</div>
        </div>
      </header>

      <div class="console-content">
        <section class="console-panel">
          <div class="console-panel__header">
            <div>
              <h2>{{ t('請求參數', 'Request Parameters') }}</h2>
              <p>{{ t('選擇端點並提供 JSON 內容以執行 API。', 'Configure your API call by selecting an endpoint and providing a JSON body.') }}</p>
            </div>
            <span class="phase-chip">PHASE 1 · {{ FORMULA_VERSION }}</span>
          </div>

          <div class="console-panel__body">
            <div class="console-field-group">
              <div class="console-field-group__header">
                <label for="api-endpoint-select">{{ t('目標端點', 'Target Endpoint') }}</label>
                <span>{{ t('所有端點都使用目前的 API 連線。', 'All endpoints use the current API connection.') }}</span>
              </div>
              <select id="api-endpoint-select" v-model="selectedKey" @change="onEndpointChange">
                <option v-for="e in endpoints" :key="e.key" :value="e.key">
                  {{ e.method }} {{ e.path }}
                </option>
              </select>
            </div>

            <div class="console-field-group" v-if="selected?.path.includes('{calc_run_id}')">
              <div class="console-field-group__header">
                <label for="api-calc-run-id">calc_run_id</label>
                <span>{{ t('用於需要指定執行編號的端點。', 'Used for run-specific endpoints.') }}</span>
              </div>
              <input id="api-calc-run-id" v-model="runIdForPath" type="text" />
            </div>

            <div class="console-field-group">
              <div class="console-field-group__header">
                <label for="api-request-body">{{ t('請求內容 (JSON)', 'Request Body (JSON)') }}</label>
                <!-- <button class="console-inline-button" type="button" @click="setBodyFromSample">
                  Restore Sample
                </button> -->
              </div>
              <div class="code-panel">
                <div class="code-panel__bar">
                  <span>INPUTS</span>
                  <!-- <span class="code-panel__dot" /> -->
                </div>
                <textarea id="api-request-body" class="console-editor" v-model="bodyText" />
              </div>
            </div>

            <div class="console-request-footer">
              <div class="console-connection">
                <span class="console-connection__dot" />
                <span>{{ t('引擎已連線', 'Engine Connected') }}</span>
              </div>
              <button class="console-run-button" :disabled="loading" @click="runEndpoint">
                <span class="console-run-button__icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <path d="M8 6l10 6-10 6z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" />
                  </svg>
                </span>
                <span>{{ loading ? t('執行中...', 'Running...') : t('執行端點', 'Run Endpoint') }}</span>
              </button>
            </div>

            <p v-if="error" class="console-error">{{ error }}</p>
          </div>
        </section>

        <section class="console-panel">
          <div class="console-panel__header">
            <div>
              <h2>{{ t('執行回應', 'Execution Response') }}</h2>
              <p>{{ t('顯示 BERSn 引擎的原始回應與計算結果。', 'Raw system output and calculation results from the BERSn engine.') }}</p>
            </div>
            <!-- <div class="console-status">
              <span>Status:</span>
              <span
                class="console-status__badge"
                :class="{
                  'console-status__badge--error': error || responseStatus.startsWith('4') || responseStatus.startsWith('5'),
                  'console-status__badge--ok': responseText && !error && !responseStatus.startsWith('4') && !responseStatus.startsWith('5'),
                }"
              >
                {{ responseStatus === '-' ? 'Idle' : responseStatus }}
              </span>
            </div> -->
          </div>

          <div class="console-panel__body">
            <div class="console-divider">
              <span>{{ t('回應內容', 'Response Body') }}</span>
            </div>

            <div class="code-panel">
              <div class="code-panel__bar">
                <span>OUTPUTS</span>
                <!-- <span class="code-panel__dot" /> -->
              </div>
              <pre class="console-response">{{ responseText || idleResponseText }}</pre>
            </div>

            <!-- <div class="console-meta">
              <div class="console-meta__item">
                <span>State</span>
                <strong>{{ error ? 'ERROR' : responseText ? 'ACTIVE' : 'IDLE' }}</strong>
              </div>
              <div class="console-meta__item">
                <span>Run ID</span>
                <strong class="console-meta__run-id">{{ getDisplayedCalcRunId() }}</strong>
              </div>
              <div class="console-meta__item">
                <span>Format</span>
                <strong>JSON</strong>
              </div>
              <button class="console-doc-button" type="button" @click="navigate('/calculation')">
                Open Calculation
              </button>
            </div> -->
          </div>
        </section>

        <footer class="console-footer">
          <!-- <p>
            Need help with the calculation formulas? Check the Technical Specification Docs or reach out to the
            system engineering team.
          </p>
          <div class="console-footer__meta">
            <span>Secure API</span>
            <span>Real-time Sync</span>
            <span>Formula V4.2</span>
          </div> -->
          <p class="console-footer__copyright">© 2026 {{ t('EngineOps Core Systems. 版權所有。', 'EngineOps Core Systems. All rights reserved.') }}</p>
        </footer>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import LanguageToggle from '../components/LanguageToggle.vue';
import { useI18n } from '../i18n';
import { navigate } from '../nav';

// Frontend -> API URL by environment:
// - Development UI (local Vite frontend): use `http://localhost:8080`
// - Testing UI (Zeabur frontend): `.env.production` sets `VITE_API_URL=https://calengine-api.zeabur.app`
// - Production UI: set `VITE_API_URL` to the future production API URL
const API_BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) || 'http://localhost:8080';
const { t } = useI18n();
const PROJECT_ID = '11111111-1111-1111-1111-111111111111';
const FORMULA_VERSION = 'v1.0';
const idleResponseText = computed(() => t(
  '{\n  "status": "idle",\n  "message": "執行端點後即可查看即時回應。"\n}',
  '{\n  "status": "idle",\n  "message": "Run an endpoint to inspect the live response."\n}',
));

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
  beta1: 0.474,
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
    sample: { project_id: PROJECT_ID, calc_run_id: '{{calc_run_id}}', formula_version: FORMULA_VERSION, inputs: { SCOREEE: 69.12969442500585, ...scaleValues, beta1: 0.474, CFn: 0.91 } },
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

<style scoped>
.api-console-page {
  min-height: 100vh;
  padding: 20px;
  font-family: var(--ui-font-sans);
  background:
    radial-gradient(circle at top center, rgba(210, 220, 234, 0.3), transparent 38%),
    linear-gradient(180deg, #f8fafc 0%, #f5f7fb 100%);
  color: #111827;
}

.api-console-page svg {
  display: block;
  max-width: 100%;
  max-height: 100%;
}

.api-console-shell {
  max-width: 1180px;
  margin: 0 auto;
  background: #ffffff;
  border: 1px solid #e6ebf3;
  border-radius: 24px;
  box-shadow: 0 22px 42px rgba(15, 23, 42, 0.06);
  overflow: hidden;
}

.console-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  padding: 14px 20px;
  border-bottom: 1px solid #e9eef7;
  background: #fff;
}

.title-block h1 {
  margin: 0;
  font-size: var(--text-2xl);
  line-height: 1.15;
  letter-spacing: -0.03em;
  font-weight: 800;
  color: #1e293b;
}

.title-block p {
  margin: 2px 0 0;
  font-size: var(--text-base);
  line-height: 1.55;
  color: #64748b;
}

.console-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.console-toolbar__group {
  display: inline-flex;
  align-items: center;
  gap: 0;
  min-height: 38px;
  padding: 0 10px;
  border: 1px solid #e5ecf6;
  border-radius: 999px;
  background: #fff;
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.04);
}

.console-link {
  border: 0;
  background: transparent;
  color: #3869b4;
  font-size: var(--text-sm);
  font-weight: 700;
  cursor: pointer;
  padding: 0 14px;
  line-height: 1;
  min-height: 38px;
  display: inline-flex;
  align-items: center;
}

.console-avatar {
  width: 28px;
  height: 28px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, #f6d8bc, #9a5f3d);
  color: #fff;
  font-size: var(--text-xs);
  font-weight: 700;
  box-shadow: 0 8px 18px rgba(154, 95, 61, 0.18);
}

.console-toolbar__group .console-link + .console-link {
  border-left: 1px solid #edf2f8;
}

.console-content {
  padding: 20px 24px 44px;
}

.console-panel {
  margin-bottom: 28px;
  border: 1px solid #eaedf3;
  border-radius: 22px;
  background: #ffffff;
  box-shadow: 0 12px 30px rgba(15, 23, 42, 0.04);
  overflow: hidden;
}

.console-panel__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  padding: 22px 22px 18px;
  border-bottom: 1px solid #edf1f6;
}

.console-panel__header h2 {
  margin: 0 0 6px;
  font-size: var(--text-xl);
  font-weight: 800;
  color: #171d27;
}

.console-panel__header p {
  margin: 0;
  color: #6b7280;
  font-size: var(--text-sm);
}

.phase-chip,
.console-status__badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 34px;
  padding: 0 14px;
  border-radius: 999px;
  border: 1px solid #d8dde7;
  background: #fafbfd;
  color: #3f4857;
  font-size: var(--text-xs);
  font-weight: 800;
  white-space: nowrap;
}

.console-panel__body {
  padding: 22px;
}

.console-field-group + .console-field-group {
  margin-top: 24px;
}

.console-field-group__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 10px;
}

.console-field-group__header label {
  color: #596273;
  font-size: var(--text-sm);
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.console-field-group__header span {
  color: #6b7280;
  font-size: var(--text-sm);
}

.console-inline-button {
  border: 0;
  background: transparent;
  color: #111827;
  font-size: var(--text-sm);
  font-weight: 700;
  cursor: pointer;
}

.console-inline-button:hover {
  color: #0f6bdc;
}

.console-panel select,
.console-panel input,
.console-editor {
  width: 100%;
  border: 1px solid #dce4ef;
  border-radius: 14px;
  background: #ffffff;
  color: #111827;
  font: inherit;
}

.console-panel select,
.console-panel input {
  height: 48px;
  padding: 0 14px;
  font-size: var(--text-base);
}

.code-panel {
  border: 1px solid #dce4ef;
  border-radius: 16px;
  overflow: hidden;
  background: #ffffff;
}

.code-panel__bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  border-bottom: 1px solid #e8edf5;
  background: linear-gradient(180deg, #fbfcfe 0%, #f7f9fc 100%);
}

.code-panel__bar span:first-child {
  color: #6b7280;
  font-size: var(--text-xs);
  font-weight: 800;
  letter-spacing: 0.05em;
}

.code-panel__dot {
  width: 8px;
  height: 8px;
  border-radius: 999px;
  background: #f3b6bc;
  box-shadow: 0 0 0 3px rgba(243, 182, 188, 0.2);
}

.console-editor {
  min-height: 360px;
  padding: 18px 20px;
  border: 0;
  border-radius: 0;
  resize: vertical;
  font-family: var(--ui-font-mono);
  font-size: var(--text-sm);
  line-height: 1.7;
}

.console-request-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding-top: 24px;
  margin-top: 24px;
  border-top: 1px solid #edf1f6;
}

.console-connection {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: #64748b;
  font-size: var(--text-sm);
  font-weight: 600;
}

.console-connection__dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  background: #16a34a;
  box-shadow: 0 0 0 4px rgba(22, 163, 74, 0.14);
}

.console-run-button {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 0 28px;
  height: 58px;
  border: 0;
  border-radius: 14px;
  background: #111111;
  color: #ffffff;
  font-size: var(--text-base);
  font-weight: 800;
  box-shadow: 0 14px 24px rgba(17, 17, 17, 0.18);
  cursor: pointer;
}

.console-run-button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.console-run-button__icon {
  width: 18px;
  height: 18px;
}

.console-error {
  margin: 16px 0 0;
  color: #dc2626;
  font-size: var(--text-sm);
  font-weight: 700;
}

.console-status {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: #4b5563;
  font-size: var(--text-sm);
  font-weight: 700;
}

.console-status__badge--ok {
  border-color: #dbe4ef;
  background: #ffffff;
  color: #1f2937;
}

.console-status__badge--error {
  border-color: #fecaca;
  background: #fef2f2;
  color: #b91c1c;
}

.console-divider {
  position: relative;
  display: flex;
  justify-content: center;
  margin-bottom: 18px;
}

.console-divider::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 1px;
  background: #e7ecf4;
}

.console-divider span {
  position: relative;
  z-index: 1;
  padding: 0 14px;
  background: #ffffff;
  color: #6b7280;
  font-size: var(--text-xs);
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
}

.console-response {
  min-height: 300px;
  margin: 0;
  padding: 18px 20px;
  font-family: var(--ui-font-mono);
  font-size: var(--text-sm);
  line-height: 1.7;
  color: #111827;
  white-space: pre-wrap;
  word-break: break-word;
}

.console-meta {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr)) auto;
  gap: 14px;
  margin-top: 18px;
  align-items: stretch;
}

.console-meta__item {
  padding: 14px 16px;
  border: 1px solid #e8edf5;
  border-radius: 16px;
  background: #fbfcfe;
}

.console-meta__item span {
  display: block;
  margin-bottom: 6px;
  color: #6b7280;
  font-size: var(--text-xs);
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.console-meta__item strong {
  display: block;
  color: #111827;
  font-size: var(--text-lg);
  font-weight: 800;
}

.console-meta__run-id {
  font-size: var(--text-sm);
  line-height: 1.45;
  word-break: break-all;
}

.console-doc-button {
  justify-self: end;
  align-self: center;
  min-width: 184px;
  height: 52px;
  padding: 0 18px;
  border-radius: 14px;
  border: 1px solid #dce4ef;
  background: #ffffff;
  color: #1f2937;
  font-size: var(--text-base);
  font-weight: 700;
  cursor: pointer;
}

.console-footer {
  padding: 24px 0 8px;
  text-align: center;
}

.console-footer p {
  margin: 0;
  color: #6b7280;
  font-size: var(--text-sm);
  line-height: 1.6;
}

.console-footer__meta {
  display: inline-flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 18px;
  margin-top: 14px;
  color: #6b7280;
  font-size: var(--text-xs);
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.console-footer__meta span {
  position: relative;
}

.console-footer__meta span + span::before {
  content: '•';
  position: absolute;
  left: -12px;
  color: #9ca3af;
}

.console-footer__copyright {
  margin-top: 24px !important;
  color: #4b5563 !important;
  font-size: var(--text-sm) !important;
}

@media (max-width: 960px) {
  .api-console-page {
    padding: 12px;
  }

  .console-topbar,
  .console-content {
    padding-left: 18px;
    padding-right: 18px;
  }

  .console-topbar,
  .console-panel__header,
  .console-request-footer {
    flex-direction: column;
    align-items: stretch;
  }

  .console-toolbar {
    justify-content: flex-start;
    flex-wrap: wrap;
  }

  .console-hero h1 {
    font-size: 2.35rem;
  }

  .console-meta {
    grid-template-columns: 1fr;
  }

  .console-doc-button {
    justify-self: stretch;
    width: 100%;
  }
}

@media (max-width: 720px) {
  .api-console-page {
    padding: 10px;
  }

  .api-console-shell {
    border-radius: 18px;
  }

  .console-topbar,
  .console-content {
    padding-left: 14px;
    padding-right: 14px;
  }

  .console-panel__header,
  .console-panel__body {
    padding-left: 16px;
    padding-right: 16px;
  }

  .console-toolbar,
  .console-toolbar__group {
    width: 100%;
  }

  .console-toolbar__group {
    justify-content: flex-start;
  }

  .console-link {
    flex: 1 1 auto;
    justify-content: center;
    text-align: center;
  }

  .console-avatar {
    align-self: flex-end;
  }

  .console-field-group__header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .console-editor,
  .console-response {
    min-height: 260px;
    padding: 14px 16px;
  }

  .console-request-footer {
    gap: 14px;
  }

  .console-run-button {
    width: 100%;
    justify-content: center;
  }
}

@media (max-width: 560px) {
  .api-console-page {
    padding: 8px;
  }

  .console-topbar,
  .console-content {
    padding-left: 12px;
    padding-right: 12px;
  }

  .console-panel__header,
  .console-panel__body {
    padding-left: 12px;
    padding-right: 12px;
  }

  .console-topbar {
    gap: 10px;
  }

  .console-toolbar__group {
    padding: 8px 10px;
  }

  .console-link {
    min-height: 34px;
    padding: 0 10px;
  }

  .phase-chip {
    align-self: flex-start;
  }

  .console-editor,
  .console-response {
    min-height: 220px;
    line-height: 1.6;
  }

  .console-request-footer {
    align-items: stretch;
  }

  .console-footer {
    padding-top: 18px;
  }

  .console-footer__meta {
    gap: 12px;
  }
}
</style>
