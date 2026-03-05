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

const API_BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) || 'http://localhost:8080';

type EndpointDef = {
  key: string;
  method: 'GET' | 'POST';
  path: string;
  sample: Record<string, unknown> | null;
};

const endpoints: EndpointDef[] = [
  { key: 'health', method: 'GET', path: '/health', sample: null },
  { key: 'ready', method: 'GET', path: '/ready', sample: null },
  { key: 'authLogin', method: 'POST', path: '/api/auth/login', sample: { username: 'agency_test', password: 'phase1_demo' } },
  { key: 'normalize', method: 'POST', path: '/api/bersn/classification/normalize', sample: { total_above_ground_floor_area_m2: 12000, segments: [{ appendix1_code: 'G2', table_3_2_label: 'G-2 辦公場所', display_name: 'Office', area_m2: 12000, operation_mode: 'all_year', urban_zone: 'A' }] } },
  { key: 'runCalc', method: 'POST', path: '/api/bersn/calc', sample: { project_id: '11111111-1111-1111-1111-111111111111', branch_type: 'WITHOUT_HOT_WATER', formula_version: 'v1.0', inputs: { E_design: 1000, E_baseline: 1200 } } },
  { key: 'afe', method: 'POST', path: '/api/bersn/formulas/afe', sample: { calc_run_id: 'test-run-001', formula_version: 'v1.0', inputs: { AF: 12000, excluded_zones: [{ type: 'indoor_parking', area_m2: 1800 }] } } },
  { key: 'eteui', method: 'POST', path: '/api/bersn/formulas/eteui', sample: { calc_run_id: 'test-run-001', formula_version: 'v1.0', inputs: { AFe: 10200, elevators: [{ Nej: 4, Eelj: 8.24, YOHj: 2500 }] } } },
  { key: 'weights', method: 'POST', path: '/api/bersn/formulas/weights', sample: { calc_run_id: 'test-run-001', formula_version: 'v1.0', inputs: { building_code: 'G2', operation_mode: 'full_year_ac', EtEUI: 4.847 } } },
  { key: 'generalEEIPath', method: 'POST', path: '/api/bersn/formulas/general-eei', sample: { project_id: '11111111-1111-1111-1111-111111111111', calc_run_id: 'test-run-001', formula_version: 'v1.0', inputs: {} } },
  { key: 'preprocess', method: 'POST', path: '/api/bersn/formulas/preprocess-efficiency', sample: { calc_run_id: 'test-run-001', formula_version: 'v1.0', inputs: { EEV: 0.85, EAC: 0.72, EL: 0.65 } } },
  { key: 'eeiGeneral', method: 'POST', path: '/api/bersn/formulas/eei-general', sample: { calc_run_id: 'test-run-001', formula_version: 'v1.0', inputs: { a: 0.67, b: 0.31, c: 0.02, EAC: 0.72, EEV: 0.85, Es: 0.05, EL: 0.65, Et: 0.5 } } },
  { key: 'scoreGeneral', method: 'POST', path: '/api/bersn/formulas/score-general', sample: { project_id: '11111111-1111-1111-1111-111111111111', calc_run_id: 'test-run-001', formula_version: 'v1.0', inputs: { EEI: 0.6565 } } },
  { key: 'scaleValues', method: 'POST', path: '/api/bersn/formulas/scale-values-general', sample: { project_id: '11111111-1111-1111-1111-111111111111', calc_run_id: 'test-run-001', formula_version: 'v1.0', inputs: { AEUI: 42.4, LEUI: 20, EEUI: 6, EtEUI: 4.847, UR: 1 } } },
  { key: 'indicators', method: 'POST', path: '/api/bersn/formulas/indicators-general', sample: { project_id: '11111111-1111-1111-1111-111111111111', calc_run_id: 'test-run-001', formula_version: 'v1.0', inputs: { SCOREEE: 69.1, EUIn: 39.6, EUIg: 59.7, EUIm: 73.2, EUImax: 140.4, beta1: 0.494, CFn: 0.91 } } },
  { key: 'grade', method: 'POST', path: '/api/bersn/formulas/grade-general', sample: { project_id: '11111111-1111-1111-1111-111111111111', calc_run_id: 'test-run-001', formula_version: 'v1.0', inputs: { SCOREEE: 69.1, EUI_star: 50.1, EUIn: 39.6, EUIg: 59.7, EUImax: 140.4 } } },
  { key: 'generalFull', method: 'POST', path: '/api/bersn/formulas/general-full', sample: { project_id: '11111111-1111-1111-1111-111111111111', calc_run_id: 'test-run-001', formula_version: 'v1.0', inputs: {} } },
  { key: 'eac', method: 'POST', path: '/api/bersn/formulas/eac', sample: { calc_run_id: 'test-run-001', formula_version: 'v1.0', inputs: { method: 'central_le_50', BW: 1, EE: 0.29, HT: 1, INAC: 1 } } },
  { key: 'el', method: 'POST', path: '/api/bersn/formulas/el', sample: { calc_run_id: 'test-run-001', formula_version: 'v1.0', inputs: { line_items: [{ index: 1, numerator: 1000, denominator: 2000 }] } } },
  { key: 'hotwaterPre', method: 'POST', path: '/api/bersn/formulas/hotwater-preprocess', sample: { calc_run_id: 'test-run-001', formula_version: 'v1.0', inputs: { AFe: 10200, hotwater_category: 'hotel', hotwater_system_type: 'electric_storage', NPi: 300 } } },
  { key: 'hotwaterFull', method: 'POST', path: '/api/bersn/formulas/hotwater-full', sample: { project_id: '11111111-1111-1111-1111-111111111111', calc_run_id: 'test-run-001', formula_version: 'v1.0', inputs: {} } },
  { key: 'renewPre', method: 'POST', path: '/api/bersn/formulas/renewable-preprocess', sample: { calc_run_id: 'test-run-001', formula_version: 'v1.0', inputs: { renewable_type: 'pv', T: 1, pv_max_generation_efficiency_kwh_per_kw_day: 3.55, PV_installed_capacity_kW: 100 } } },
  { key: 'renewBonus', method: 'POST', path: '/api/bersn/formulas/renewable-bonus', sample: { calc_run_id: 'test-run-001', formula_version: 'v1.0', inputs: { method: 'pv_area_method', SCOREEE_before: 67.85, Rs: 0.3, T: 1 } } },
  { key: 'nzbElig', method: 'POST', path: '/api/bersn/formulas/nzb-eligibility', sample: { calc_run_id: 'test-run-001', formula_version: 'v1.0', inputs: { grade: '1+' } } },
  { key: 'nzbBalance', method: 'POST', path: '/api/bersn/formulas/nzb-balance', sample: { calc_run_id: 'test-run-001', formula_version: 'v1.0', inputs: { TEUI: 55.1, AFe: 10200, TGE: 600000 } } },
  { key: 'nzbEvaluate', method: 'POST', path: '/api/bersn/formulas/nzb-evaluate', sample: { calc_run_id: 'test-run-001', formula_version: 'v1.0', inputs: { grade: '1+', TEUI: 55.1, AFe: 10200, TGE: 600000 } } },
  { key: 'runDetails', method: 'GET', path: '/api/bersn/runs/{calc_run_id}', sample: null },
];

const defaultEndpoint = endpoints[0] as EndpointDef;
const selectedKey = ref(defaultEndpoint.key);
const runIdForPath = ref('test-run-001');
const bodyText = ref('');
const responseText = ref('');
const responseStatus = ref('-');
const error = ref('');
const loading = ref(false);

const selected = computed<EndpointDef>(() => endpoints.find((e) => e.key === selectedKey.value) || defaultEndpoint);

function onEndpointChange() {
  bodyText.value = selected.value.sample ? JSON.stringify(selected.value.sample, null, 2) : '';
  responseText.value = '';
  error.value = '';
}

function resolvePath(path: string): string {
  return path.includes('{calc_run_id}')
    ? path.replace('{calc_run_id}', encodeURIComponent(runIdForPath.value.trim() || 'test-run-001'))
    : path;
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
      const body = bodyText.value.trim() ? JSON.parse(bodyText.value) : {};
      response = await fetch(`${API_BASE_URL}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
    }
    responseStatus.value = `${response.status} ${response.statusText}`;
    const parsed = await response.json().catch(() => ({}));
    responseText.value = JSON.stringify(parsed, null, 2);
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Request failed';
  } finally {
    loading.value = false;
  }
}

onEndpointChange();
</script>
