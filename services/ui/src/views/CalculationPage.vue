<template>
  <main class="page-shell wide">
    <section class="card">
      <header class="top-row">
        <div>
          <p class="eyebrow">BERSn Calculation System - Phase 1</p>
          <h1>Calculation</h1>
          <p class="version">v1.0-Phase1</p>
        </div>
        <div class="action-group">
          <button class="btn-secondary" @click="navigate('/dashboard')">Back Dashboard</button>
          <button class="btn-secondary" @click="navigate('/api-console')">API Console</button>
          <button class="btn-secondary" @click="onLogout">Logout</button>
        </div>
      </header>

      <div class="preset-row">
        <span>Test Cases:</span>
        <button class="chip" @click="applyPreset('case1')">Case 1</button>
        <button class="chip" @click="applyPreset('case2')">Case 2</button>
        <button class="chip" @click="applyPreset('case3')">Case 3</button>
        <button class="chip" @click="applyPreset('case4')">Case 4</button>
      </div>

      <div class="calc-layout">
        <section class="panel">
          <h2>Input Section</h2>
          <div class="field-grid">
            <label class="field">
              <span>Branch</span>
              <select v-model="form.branchType">
                <option value="general">General</option>
                <option value="hotwater">Hot Water</option>
              </select>
            </label>

            <label class="field">
              <span>Efficiency Source</span>
              <select v-model="form.efficiencyMode">
                <option value="manual">Manual (provide EEV/EAC/EL)</option>
                <option value="auto">DB/JSON-driven (compute in backend)</option>
              </select>
            </label>

            <label class="field">
              <span>Building Type</span>
              <select v-model="form.buildingType">
                <option value="office">Office</option>
                <option value="retail">Retail</option>
                <option value="education">Education</option>
                <option value="hotel">Hotel</option>
              </select>
            </label>

            <label class="field">
              <span>Total Floor Area (m²)</span>
              <input v-model.number="form.totalFloorArea" type="number" min="1" />
            </label>

            <label class="field">
              <span>Excluded Area (m²)</span>
              <input v-model.number="form.excludedArea" type="number" min="0" />
            </label>

            <label class="field">
              <span>Elevator Count (Nej)</span>
              <input v-model.number="form.elevatorCount" type="number" min="1" />
            </label>

            <label class="field">
              <span>Eelj</span>
              <input v-model.number="form.eelj" type="number" min="0" step="0.01" />
            </label>

            <label class="field">
              <span>YOHj</span>
              <input v-model.number="form.yohj" type="number" min="0" />
            </label>

            <label class="field">
              <span>AEUI</span>
              <input v-model.number="form.aeui" type="number" min="0" step="0.01" />
            </label>

            <label class="field">
              <span>LEUI</span>
              <input v-model.number="form.leui" type="number" min="0" step="0.01" />
            </label>

            <label class="field">
              <span>EEUI</span>
              <input v-model.number="form.eeui" type="number" min="0" step="0.01" />
            </label>

            <label class="field">
              <span>UR</span>
              <input v-model.number="form.ur" type="number" min="0" max="1" step="0.01" />
            </label>

            <template v-if="form.efficiencyMode === 'manual'">
              <label class="field">
                <span>EAC</span>
                <input v-model.number="form.eac" type="number" min="0" step="0.01" />
              </label>
              <label class="field">
                <span>EEV</span>
                <input v-model.number="form.eev" type="number" min="0" step="0.01" />
              </label>
              <label class="field">
                <span>EL</span>
                <input v-model.number="form.el" type="number" min="0" step="0.01" />
              </label>
            </template>

            <label class="field">
              <span>Es</span>
              <input v-model.number="form.es" type="number" min="0" step="0.01" />
            </label>

            <label class="field">
              <span>Et</span>
              <input v-model.number="form.et" type="number" min="0" step="0.01" />
            </label>

            <label class="field">
              <span>beta1</span>
              <input v-model.number="form.beta1" type="number" min="0.0001" step="0.001" />
            </label>

            <label class="field">
              <span>CFn</span>
              <input v-model.number="form.cfn" type="number" min="0.0001" step="0.01" />
            </label>
          </div>

          <div v-if="form.efficiencyMode === 'auto'" class="hotwater-box">
            <h3>DB/JSON-driven Efficiency Inputs</h3>
            <p class="hint">Used by backend preprocessing to compute EEV/EAC/EL from Appendix 2 + JSON tables.</p>
            <div class="field-grid">
              <label class="field">
                <span>EV</span>
                <input v-model.number="form.ev" type="number" min="0" />
              </label>
              <label class="field">
                <span>Altitude (m)</span>
                <input v-model.number="form.altitudeM" type="number" min="0" />
              </label>
              <label class="field">
                <span>Climate Zone</span>
                <select v-model="form.climateZone">
                  <option value="SOUTH">SOUTH</option>
                  <option value="NORTH">NORTH</option>
                </select>
              </label>
              <label class="field">
                <span>Building Group</span>
                <input v-model="form.buildingGroup" type="text" />
              </label>
              <label class="field">
                <span>Wall Area</span>
                <input v-model.number="form.wallArea" type="number" min="1" />
              </label>
              <label class="field">
                <span>Window Area</span>
                <input v-model.number="form.windowArea" type="number" min="0" />
              </label>
              <label class="field">
                <span>EAC Method</span>
                <select v-model="form.eacMethod">
                  <option value="central_le_50">central_le_50</option>
                  <option value="central_gt_50">central_gt_50</option>
                  <option value="noncentral_chiller">noncentral_chiller</option>
                </select>
              </label>
              <label class="field">
                <span>EL numerator total</span>
                <input v-model.number="form.elNumeratorTotal" type="number" min="0" />
              </label>
              <label class="field">
                <span>EL denominator total</span>
                <input v-model.number="form.elDenominatorTotal" type="number" min="1" />
              </label>
            </div>
          </div>

          <div v-if="form.branchType === 'hotwater'" class="hotwater-box">
            <h3>Hot Water Inputs</h3>
            <div class="field-grid">
              <label class="field">
                <span>Hot Water Category</span>
                <select v-model="form.hotwaterCategory">
                  <option value="hospital">hospital</option>
                  <option value="long_term_care">long_term_care</option>
                  <option value="hotel">hotel</option>
                  <option value="dormitory">dormitory</option>
                  <option value="fitness_leisure">fitness_leisure</option>
                </select>
              </label>
              <label class="field">
                <span>System Type</span>
                <select v-model="form.hotwaterSystemType">
                  <option value="electric_storage">electric_storage</option>
                  <option value="gas_storage">gas_storage</option>
                  <option value="heat_pump">heat_pump</option>
                </select>
              </label>
              <label class="field">
                <span>NPi</span>
                <input v-model.number="form.npi" type="number" min="0" />
              </label>
            </div>
          </div>

          <div class="hotwater-box">
            <h3>Optional Additional Checks</h3>
            <div class="field-grid">
              <label class="field">
                <span><input v-model="form.enableRenewable" type="checkbox" /> Enable Renewable Bonus (3-8)</span>
              </label>
              <label class="field">
                <span><input v-model="form.enableNZB" type="checkbox" /> Enable NZB Evaluate (3-9)</span>
              </label>
              <label v-if="form.enableRenewable" class="field">
                <span>Renewable Method</span>
                <select v-model="form.renewableMethod">
                  <option value="pv_area_method">pv_area_method</option>
                  <option value="generation_method">generation_method</option>
                </select>
              </label>
              <label v-if="form.enableRenewable" class="field">
                <span>PV Installed Capacity kW</span>
                <input v-model.number="form.pvInstalledCapacityKw" type="number" min="1" />
              </label>
              <label v-if="form.enableRenewable" class="field">
                <span>PV max efficiency kWh/(kW.day)</span>
                <input v-model.number="form.pvMaxEfficiency" type="number" min="0.1" step="0.01" />
              </label>
              <label v-if="form.enableRenewable && form.renewableMethod === 'generation_method'" class="field">
                <span>GE override (kWh/yr)</span>
                <input v-model.number="form.geOverride" type="number" min="0" />
              </label>
              <label v-if="form.enableNZB" class="field">
                <span>TGE (kWh/yr)</span>
                <input v-model.number="form.tge" type="number" min="0" />
              </label>
            </div>
          </div>

          <button class="btn-primary run-btn" :disabled="loading" @click="runCalculation">
            {{ loading ? 'Running...' : 'Run Calculation' }}
          </button>
          <p v-if="error" class="error">{{ error }}</p>
        </section>

        <section class="panel output-panel">
          <h2>Output Section</h2>
          <div v-if="!result" class="placeholder">Run calculation to view outputs and full evidence trace.</div>
          <template v-else>
            <div class="output-grid">
              <div class="metric"><span>AFe</span><strong>{{ format(result.outputs.AFe) }}</strong></div>
              <div class="metric"><span>EEI</span><strong>{{ format(result.outputs.EEI) }}</strong></div>
              <div class="metric"><span>SCORE</span><strong>{{ format(result.outputs.SCOREEE) }}</strong></div>
              <div class="metric"><span>Grade</span><strong>{{ result.outputs.grade_result?.grade || '-' }}</strong></div>
              <div class="metric"><span>EUI*</span><strong>{{ format(result.outputs.indicators?.EUI_star) }}</strong></div>
              <div class="metric"><span>CEI*</span><strong>{{ format(result.outputs.indicators?.CEI_star) }}</strong></div>
              <div class="metric"><span>TEUI</span><strong>{{ format(result.outputs.indicators?.TEUI) }}</strong></div>
              <div class="metric"><span>ESR</span><strong>{{ format(result.outputs.indicators?.ESR) }}</strong></div>
            </div>

            <div class="breakdown">
              <h3>Breakdown</h3>
              <p>a: {{ format(result.outputs.weights?.a) }}</p>
              <p>b: {{ format(result.outputs.weights?.b) }}</p>
              <p>c: {{ format(result.outputs.weights?.c) }}</p>
              <p v-if="result.outputs.weights?.d !== undefined">d: {{ format(result.outputs.weights?.d) }}</p>
              <p>EtEUI: {{ format(result.outputs.EtEUI) }}</p>
              <p v-if="result.outputs.hotwater">HpEUI: {{ format(result.outputs.hotwater.HpEUI) }}</p>
              <p v-if="result.outputs.hotwater">EHW: {{ format(result.outputs.hotwater.EHW) }}</p>
              <p>Run ID: {{ result.calcRunId }}</p>
            </div>

            <div v-if="result.renewable" class="breakdown">
              <h3>Renewable Bonus (3-8)</h3>
              <pre class="trace-json">{{ toPrettyJson(result.renewable) }}</pre>
            </div>

            <div v-if="result.nzb" class="breakdown">
              <h3>NZB Evaluate (3-9)</h3>
              <pre class="trace-json">{{ toPrettyJson(result.nzb) }}</pre>
            </div>

            <div class="breakdown">
              <h3>Formulas Used</h3>
              <div class="formula-tags">
                <span v-for="f in result.formulasUsed" :key="f" class="formula-tag">{{ f }}</span>
              </div>
            </div>

            <div class="breakdown">
              <h3>Formula Trace</h3>
              <div v-for="(step, idx) in result.traceSteps" :key="idx" class="trace-step">
                <p class="trace-title">{{ Number(idx) + 1 }}. {{ step.description }}</p>
                <pre class="trace-json">{{ toPrettyJson(step.result) }}</pre>
              </div>
            </div>

            <div class="breakdown">
              <h3>Government Evidence Pack</h3>
              <button class="btn-secondary" @click="downloadEvidence">Download Evidence JSON</button>
              <p class="hint">Contains all requests/responses and run-details lookup for audit.</p>
              <pre class="trace-json">{{ toPrettyJson(result.runDetails) }}</pre>
            </div>
          </template>
        </section>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import { logout } from '../auth';
import { navigate } from '../nav';

// Frontend -> API URL by environment:
// - Development UI (local Vite frontend): use `http://localhost:8080`
// - Testing UI (Zeabur frontend): `.env.production` sets `VITE_API_URL=https://calengine-api.zeabur.app`
// - Production UI: set `VITE_API_URL` to the future production API URL
const API_BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) || 'http://localhost:8080';

type EvidenceCall = {
  name: string;
  method: 'GET' | 'POST';
  path: string;
  requestBody: unknown;
  status: number;
  responseBody: unknown;
};

const form = reactive({
  branchType: 'general',
  efficiencyMode: 'manual',
  buildingType: 'office',
  totalFloorArea: 12000,
  excludedArea: 1800,
  elevatorCount: 4,
  eelj: 8.24,
  yohj: 2500,
  aeui: 42.4,
  leui: 20.0,
  eeui: 6.0,
  ur: 1.0,
  eac: 0.72,
  eev: 0.85,
  el: 0.65,
  es: 0.05,
  et: 0.5,
  beta1: 0.494,
  cfn: 0.91,
  ev: 120,
  altitudeM: 50,
  climateZone: 'SOUTH',
  buildingGroup: 'HOTEL_GUESTROOM',
  wallArea: 800,
  windowArea: 200,
  eacMethod: 'central_le_50',
  elNumeratorTotal: 17274,
  elDenominatorTotal: 35100,
  hotwaterCategory: 'hotel',
  hotwaterSystemType: 'electric_storage',
  npi: 300,
  enableRenewable: false,
  renewableMethod: 'pv_area_method',
  pvInstalledCapacityKw: 100,
  pvMaxEfficiency: 3.55,
  geOverride: 50000,
  enableNZB: false,
  tge: 600000,
});

const loading = ref(false);
const error = ref('');
const result = ref<any>(null);

function onLogout() {
  logout();
  navigate('/login');
}

function applyPreset(key: 'case1' | 'case2' | 'case3' | 'case4') {
  const presets = {
    case1: { totalFloorArea: 12000, excludedArea: 1800, et: 0.5, eac: 0.72, el: 0.65, branchType: 'general', enableRenewable: false, enableNZB: false },
    case2: { totalFloorArea: 9000, excludedArea: 1000, et: 0.55, eac: 0.78, el: 0.6, branchType: 'general', enableRenewable: true, enableNZB: false },
    case3: { totalFloorArea: 15000, excludedArea: 2500, et: 0.48, eac: 0.7, el: 0.62, branchType: 'hotwater', enableRenewable: false, enableNZB: false },
    case4: { totalFloorArea: 8000, excludedArea: 900, et: 0.6, eac: 0.8, el: 0.58, branchType: 'hotwater', enableRenewable: true, enableNZB: true },
  } as const;
  Object.assign(form, presets[key]);
}

function format(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return '-';
  return Number(value).toFixed(3);
}

function toPrettyJson(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch (_) {
    return String(value);
  }
}

function uniqueFormulaList(parts: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of parts) {
    if (!item || seen.has(item)) continue;
    seen.add(item);
    out.push(item);
  }
  return out;
}

async function requestWithEvidence(
  evidence: EvidenceCall[],
  name: string,
  method: 'GET' | 'POST',
  path: string,
  body: unknown,
): Promise<any> {
  const url = `${API_BASE_URL}${path}`;
  const response = await fetch(url, method === 'GET'
    ? { method: 'GET' }
    : {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  const parsed = await response.json().catch(() => ({}));
  evidence.push({
    name,
    method,
    path,
    requestBody: body,
    status: response.status,
    responseBody: parsed,
  });
  if (!response.ok || parsed?.ok === false) {
    throw new Error(parsed?.message || parsed?.error || parsed?.detail || `${name} failed`);
  }
  return parsed;
}

async function runCalculation() {
  loading.value = true;
  error.value = '';
  result.value = null;
  const evidenceCalls: EvidenceCall[] = [];

  try {
    const runCreateBody = {
      project_id: '11111111-1111-1111-1111-111111111111',
      branch_type: form.branchType === 'hotwater' ? 'WITH_HOT_WATER' : 'WITHOUT_HOT_WATER',
      formula_version: 'v1.0',
      inputs: { E_design: 1000, E_baseline: 1200 },
    };

    const runResponse = await requestWithEvidence(
      evidenceCalls,
      'Create Calculation Run',
      'POST',
      '/api/bersn/calc',
      runCreateBody,
    );
    const calcRunId = String(runResponse.calc_run_id);

    const baseInputs: Record<string, unknown> = {
      AF: form.totalFloorArea,
      excluded_zones: form.excludedArea > 0 ? [{ type: 'indoor_parking', area_m2: form.excludedArea }] : [],
      elevators: [{ Nej: form.elevatorCount, Eelj: form.eelj, YOHj: form.yohj }],
      AEUI: form.aeui,
      LEUI: form.leui,
      EEUI: form.eeui,
      UR: form.ur,
      Es: form.es,
      Et: form.et,
      beta1: form.beta1,
      CFn: form.cfn,
    };

    if (form.efficiencyMode === 'manual') {
      baseInputs.EAC = form.eac;
      baseInputs.EEV = form.eev;
      baseInputs.EL = form.el;
    } else {
      baseInputs.ev_scheme = 'TOTAL_ENVLOAD';
      baseInputs.ev_indicator = 'ENVLOAD';
      baseInputs.EV = form.ev;
      baseInputs.building = {
        building_type: 'HOTEL',
        altitude_m: form.altitudeM,
        climate_zone: form.climateZone,
        UR: form.ur,
      };
      baseInputs.envelope = {
        wall_area: form.wallArea,
        window_area: form.windowArea,
      };
      baseInputs.building_group = form.buildingGroup;
      baseInputs.eac_method = form.eacMethod;
      baseInputs.BW = 1.0;
      baseInputs.EE = 0.29;
      baseInputs.HT = 1.0;
      baseInputs.INAC = 1.0;
      baseInputs.el_numerator_total = form.elNumeratorTotal;
      baseInputs.el_denominator_total = form.elDenominatorTotal;
    }

    const formulaPath = form.branchType === 'hotwater'
      ? '/api/bersn/formulas/hotwater-full'
      : '/api/bersn/formulas/general-full';

    const fullBody = {
      project_id: '11111111-1111-1111-1111-111111111111',
      calc_run_id: calcRunId,
      formula_version: 'v1.0',
      inputs: form.branchType === 'hotwater'
        ? {
          ...baseInputs,
          hotwater_category: form.hotwaterCategory,
          hotwater_system_type: form.hotwaterSystemType,
          NPi: form.npi,
        }
        : baseInputs,
    };

    const fullResponse = await requestWithEvidence(
      evidenceCalls,
      form.branchType === 'hotwater' ? 'Run Hotwater Full' : 'Run General Full',
      'POST',
      formulaPath,
      fullBody,
    );

    let mergedFormulas: string[] = [...(fullResponse.trace?.formulas_used || [])];
    const mergedSteps: Array<{ description: string; result: unknown }> = [
      ...(fullResponse.trace?.steps || []),
    ];

    let renewableResult: any = null;
    if (form.enableRenewable) {
      const renPreBody = {
        project_id: '11111111-1111-1111-1111-111111111111',
        calc_run_id: calcRunId,
        formula_version: 'v1.0',
        inputs: {
          renewable_type: 'pv',
          T: 1.0,
          PV_installed_capacity_kW: form.pvInstalledCapacityKw,
          pv_max_generation_efficiency_kwh_per_kw_day: form.pvMaxEfficiency,
          AFe: fullResponse.outputs?.AFe,
        },
      };
      const renPre = await requestWithEvidence(
        evidenceCalls,
        'Run Renewable Preprocess',
        'POST',
        '/api/bersn/formulas/renewable-preprocess',
        renPreBody,
      );

      const renBonusBody = form.renewableMethod === 'generation_method'
        ? {
          project_id: '11111111-1111-1111-1111-111111111111',
          calc_run_id: calcRunId,
          formula_version: 'v1.0',
          inputs: {
            method: 'generation_method',
            EEI_before: fullResponse.outputs?.EEI,
            EUI_star: fullResponse.outputs?.indicators?.EUI_star,
            AFe: fullResponse.outputs?.AFe,
            GE: form.geOverride || renPre.outputs?.GE,
            SCOREEE_before: fullResponse.outputs?.SCOREEE,
          },
        }
        : {
          project_id: '11111111-1111-1111-1111-111111111111',
          calc_run_id: calcRunId,
          formula_version: 'v1.0',
          inputs: {
            method: 'pv_area_method',
            SCOREEE_before: fullResponse.outputs?.SCOREEE,
            T: 1.0,
            Rs: renPre.outputs?.Rs,
          },
        };

      const renBonus = await requestWithEvidence(
        evidenceCalls,
        'Run Renewable Bonus',
        'POST',
        '/api/bersn/formulas/renewable-bonus',
        renBonusBody,
      );
      renewableResult = { preprocess: renPre.outputs, bonus: renBonus.outputs };
      mergedFormulas = mergedFormulas.concat(renPre.trace?.formulas_used || [], renBonus.trace?.formulas_used || []);
      mergedSteps.push(...(renPre.trace?.steps || []), ...(renBonus.trace?.steps || []));
    }

    let nzbResult: any = null;
    if (form.enableNZB) {
      const nzbBody = {
        project_id: '11111111-1111-1111-1111-111111111111',
        calc_run_id: calcRunId,
        formula_version: 'v1.0',
        inputs: {
          grade: fullResponse.outputs?.grade_result?.grade,
          TEUI: fullResponse.outputs?.indicators?.TEUI,
          AFe: fullResponse.outputs?.AFe,
          TGE: form.tge,
        },
      };
      const nzb = await requestWithEvidence(
        evidenceCalls,
        'Run NZB Evaluate',
        'POST',
        '/api/bersn/formulas/nzb-evaluate',
        nzbBody,
      );
      nzbResult = nzb.outputs;
      mergedFormulas = mergedFormulas.concat(nzb.trace?.formulas_used || []);
      mergedSteps.push(...(nzb.trace?.steps || []));
    }

    const runDetails = await requestWithEvidence(
      evidenceCalls,
      'Fetch Run Details',
      'GET',
      `/api/bersn/runs/${encodeURIComponent(calcRunId)}`,
      null,
    );

    result.value = {
      calcRunId,
      outputs: fullResponse.outputs || {},
      formulasUsed: uniqueFormulaList(mergedFormulas),
      traceSteps: mergedSteps,
      renewable: renewableResult,
      nzb: nzbResult,
      runDetails,
      evidenceCalls,
      inputSnapshot: JSON.parse(JSON.stringify(form)),
    };
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Unexpected error';
  } finally {
    loading.value = false;
  }
}

function downloadEvidence() {
  if (!result.value) return;
  const payload = {
    generated_at: new Date().toISOString(),
    run_id: result.value.calcRunId,
    input_snapshot: result.value.inputSnapshot,
    outputs: result.value.outputs,
    formulas_used: result.value.formulasUsed,
    trace_steps: result.value.traceSteps,
    renewable: result.value.renewable,
    nzb: result.value.nzb,
    run_details: result.value.runDetails,
    api_calls: result.value.evidenceCalls,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `bersn_evidence_${result.value.calcRunId}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
</script>
