<template>
  <main class="calc-page">
    <section class="calc-card">
      <header class="calc-topbar">
        <div class="title-block">
          <h1>{{ t('計算儀表板', 'Calculation Dashboard') }}</h1>
          <p>{{ t('設定建築參數並觀察能效模擬結果。', 'Configure building parameters and observe energy-efficiency simulations.') }}</p>
        </div>
        <div class="calc-toolbar">
          <div class="calc-toolbar__group">
            <button class="calc-link" @click="navigate('/dashboard')">{{ t('返回儀表板', 'Back Dashboard') }}</button>
            <button class="calc-link" @click="navigate('/api-console')">{{ t('執行單一公式', 'Run Individual Equation') }}</button>
            <button class="calc-link calc-link--danger" @click="onLogout">{{ t('登出', 'Logout') }}</button>
          </div>
          <LanguageToggle />
          <div class="calc-avatar">U</div>
        </div>
      </header>

      <section class="calc-header">
        <div class="calc-presets">
          <button class="calc-chip" :class="{ 'calc-chip--active': activePreset === 'case1' }" @click="applyPreset('case1')">Case 1</button>
          <button class="calc-chip" :class="{ 'calc-chip--active': activePreset === 'case2' }" @click="applyPreset('case2')">Case 2</button>
          <button class="calc-chip" :class="{ 'calc-chip--active': activePreset === 'case3' }" @click="applyPreset('case3')">Case 3</button>
          <button class="calc-chip" :class="{ 'calc-chip--active': activePreset === 'case4' }" @click="applyPreset('case4')">Case 4</button>
        </div>
      </section>

      <div class="calc-body">
        <section class="calc-input">
          <div class="calc-panel-heading">
            <span class="calc-panel-heading__icon">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M5 7h14M5 12h10M5 17h8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
              </svg>
            </span>
            <div>
              <h2>{{ t('輸入參數', 'Input Parameters') }}</h2>
              <p>{{ t('設定基礎輸入、分支選擇與附加檢核。', 'Configure base input, branch selection, and optional checks.') }}</p>
            </div>
          </div>

          <div class="calc-form-grid">
          <div class="field-grid">
            <label class="field">
              <span>{{ t('分支類型', 'Branch') }}</span>
              <select v-model="form.branchType">
                <option value="general">{{ t('一般建築', 'General') }}</option>
                <option value="hotwater">{{ t('中央熱水', 'Hot Water') }}</option>
              </select>
            </label>

            <label class="field">
              <span>{{ t('效率來源', 'Efficiency Source') }}</span>
              <select v-model="form.efficiencyMode">
                <option value="manual">{{ t('手動輸入（提供 EEV/EAC/EL）', 'Manual (provide EEV/EAC/EL)') }}</option>
                <option value="auto">{{ t('DB/JSON 後端計算', 'DB/JSON-driven (compute in backend)') }}</option>
              </select>
            </label>

            <label class="field">
              <span>{{ t('建築類型', 'Building Type') }}</span>
              <select v-model="form.buildingType">
                <option value="office">{{ t('辦公', 'Office') }}</option>
                <option value="retail">{{ t('零售', 'Retail') }}</option>
                <option value="education">{{ t('教育', 'Education') }}</option>
                <option value="hotel">{{ t('旅館', 'Hotel') }}</option>
              </select>
            </label>

            <label class="field">
              <span>{{ t('總樓地板面積 (m²)', 'Total Floor Area (m²)') }}</span>
              <input v-model.number="form.totalFloorArea" type="number" min="1" />
            </label>

            <label class="field">
              <span>{{ t('排除面積 (m²)', 'Excluded Area (m²)') }}</span>
              <input v-model.number="form.excludedArea" type="number" min="0" />
            </label>

            <label class="field">
              <span>{{ t('電梯台數 (Nej)', 'Elevator Count (Nej)') }}</span>
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

          <div v-if="form.efficiencyMode === 'auto'" class="calc-subsection">
            <h3>{{ t('DB/JSON 後端效率輸入', 'DB/JSON-driven Efficiency Inputs') }}</h3>
            <p class="hint">{{ t('供後端預處理使用，用以計算 EEV / EAC / EL。', 'Used by backend preprocessing to compute EEV/EAC/EL from Appendix 2 + JSON tables.') }}</p>
            <div class="field-grid">
              <label class="field">
                <span>EV</span>
                <input v-model.number="form.ev" type="number" min="0" />
              </label>
            <label class="field">
              <span>{{ t('海拔高度 (m)', 'Altitude (m)') }}</span>
              <input v-model.number="form.altitudeM" type="number" min="0" />
            </label>
            <label class="field">
              <span>{{ t('氣候分區', 'Climate Zone') }}</span>
              <select v-model="form.climateZone">
                <option value="SOUTH">SOUTH</option>
                <option value="NORTH">NORTH</option>
              </select>
            </label>
            <label class="field">
              <span>{{ t('建築群組', 'Building Group') }}</span>
              <input v-model="form.buildingGroup" type="text" />
            </label>
            <label class="field">
              <span>{{ t('外牆面積', 'Wall Area') }}</span>
              <input v-model.number="form.wallArea" type="number" min="1" />
            </label>
            <label class="field">
              <span>{{ t('窗戶面積', 'Window Area') }}</span>
              <input v-model.number="form.windowArea" type="number" min="0" />
            </label>
            <label class="field">
              <span>{{ t('EAC 計算方法', 'EAC Method') }}</span>
              <select v-model="form.eacMethod">
                  <option value="central_le_50">central_le_50</option>
                  <option value="central_gt_50">central_gt_50</option>
                  <option value="noncentral_chiller">noncentral_chiller</option>
                </select>
              </label>
            <label class="field">
              <span>{{ t('EL 分子總和', 'EL numerator total') }}</span>
              <input v-model.number="form.elNumeratorTotal" type="number" min="0" />
            </label>
            <label class="field">
              <span>{{ t('EL 分母總和', 'EL denominator total') }}</span>
              <input v-model.number="form.elDenominatorTotal" type="number" min="1" />
            </label>
            </div>
          </div>

          <div v-if="form.branchType === 'hotwater'" class="calc-subsection">
            <h3>{{ t('熱水系統輸入', 'Hot Water Inputs') }}</h3>
            <div class="field-grid">
              <label class="field">
                <span>{{ t('熱水類別', 'Hot Water Category') }}</span>
                <select v-model="form.hotwaterCategory">
                  <option value="hospital">hospital</option>
                  <option value="long_term_care">long_term_care</option>
                  <option value="hotel">hotel</option>
                  <option value="dormitory">dormitory</option>
                  <option value="fitness_leisure">fitness_leisure</option>
                </select>
              </label>
              <label class="field">
                <span>{{ t('系統類型', 'System Type') }}</span>
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

          <div class="calc-subsection">
            <h3>{{ t('附加檢核', 'Optional Additional Checks') }}</h3>
            <div class="field-grid">
              <label class="field field--toggle">
                <span class="field-toggle">
                  <input v-model="form.enableRenewable" type="checkbox" />
                  <span>{{ t('啟用再生能源加成 (3-8)', 'Enable Renewable Bonus (3-8)') }}</span>
                </span>
              </label>
              <label class="field field--toggle">
                <span class="field-toggle">
                  <input v-model="form.enableNZB" type="checkbox" />
                  <span>{{ t('啟用 NZB 評估 (3-9)', 'Enable NZB Evaluate (3-9)') }}</span>
                </span>
              </label>
              <label v-if="form.enableRenewable" class="field">
                <span>{{ t('再生能源方法', 'Renewable Method') }}</span>
                <select v-model="form.renewableMethod">
                  <option value="pv_area_method">pv_area_method</option>
                  <option value="generation_method">generation_method</option>
                </select>
              </label>
              <label v-if="form.enableRenewable" class="field">
                <span>{{ t('PV 裝置容量 kW', 'PV Installed Capacity kW') }}</span>
                <input v-model.number="form.pvInstalledCapacityKw" type="number" min="1" />
              </label>
              <label v-if="form.enableRenewable" class="field">
                <span>{{ t('PV 最大发电效率 kWh/(kW.day)', 'PV max efficiency kWh/(kW.day)') }}</span>
                <input v-model.number="form.pvMaxEfficiency" type="number" min="0.1" step="0.01" />
              </label>
              <label v-if="form.enableRenewable && form.renewableMethod === 'generation_method'" class="field">
                <span>{{ t('GE 覆寫值 (kWh/yr)', 'GE override (kWh/yr)') }}</span>
                <input v-model.number="form.geOverride" type="number" min="0" />
              </label>
              <label v-if="form.enableNZB" class="field">
                <span>TGE (kWh/yr)</span>
                <input v-model.number="form.tge" type="number" min="0" />
              </label>
            </div>
          </div>

          <button class="calc-run-button" :disabled="loading" @click="runCalculation">
            <span class="calc-run-button__icon">▷</span>
            <span>{{ loading ? t('執行中...', 'Running...') : t('執行計算', 'Run Calculation') }}</span>
          </button>
          <p v-if="error" class="calc-error">{{ error }}</p>
          </div>
        </section>

        <section class="calc-output">
          <div class="calc-panel-heading">
            <span class="calc-panel-heading__icon">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 5v14M5 12h14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
              </svg>
            </span>
            <div>
              <h2>{{ t('結果輸出', 'Resulting Output') }}</h2>
              <p>{{ t('依據輸入參數計算出的指標結果。', 'Computed metrics based on your parameters.') }}</p>
            </div>
          </div>

          <div v-if="!result" class="calc-placeholder">{{ t('執行計算後即可查看輸出與完整證據軌跡。', 'Run calculation to view outputs and full evidence trace.') }}</div>
          <template v-else>
            <div class="calc-metric-grid">
              <div class="calc-metric-card"><span>AFe</span><strong>{{ format(result.outputs.AFe) }}</strong></div>
              <div class="calc-metric-card"><span>EEI</span><strong>{{ format(result.outputs.EEI) }}</strong></div>
              <div class="calc-metric-card calc-metric-card--accent"><span>SCORE</span><strong>{{ format(result.outputs.SCOREEE) }}</strong></div>
              <div class="calc-metric-card calc-metric-card--accent"><span>{{ t('等級', 'Grade') }}</span><strong>{{ result.outputs.grade_result?.grade || '-' }}</strong></div>
              <div class="calc-metric-card calc-metric-card--accent"><span>EUI*</span><strong>{{ format(result.outputs.indicators?.EUI_star) }}</strong></div>
              <div class="calc-metric-card calc-metric-card--accent"><span>CEI*</span><strong>{{ format(result.outputs.indicators?.CEI_star) }}</strong></div>
              <div class="calc-metric-card"><span>TEUI</span><strong>{{ format(result.outputs.indicators?.TEUI) }}</strong></div>
              <div class="calc-metric-card"><span>ESR</span><strong>{{ format(result.outputs.indicators?.ESR) }}</strong></div>
            </div>

            <div class="calc-output-grid">
              <div class="calc-output-card">
                <h3>{{ t('指標拆解', 'Metric Breakdown') }}</h3>
                <div class="calc-breakdown-grid">
                  <p><span>a</span><strong>{{ format(result.outputs.weights?.a) }}</strong></p>
                  <p><span>b</span><strong>{{ format(result.outputs.weights?.b) }}</strong></p>
                  <p><span>c</span><strong>{{ format(result.outputs.weights?.c) }}</strong></p>
                  <p v-if="result.outputs.weights?.d !== undefined"><span>d</span><strong>{{ format(result.outputs.weights?.d) }}</strong></p>
                  <p><span>EtEUI</span><strong>{{ format(result.outputs.EtEUI) }}</strong></p>
                  <p v-if="result.outputs.hotwater"><span>HpEUI</span><strong>{{ format(result.outputs.hotwater.HpEUI) }}</strong></p>
                  <p v-if="result.outputs.hotwater"><span>EHW</span><strong>{{ format(result.outputs.hotwater.EHW) }}</strong></p>
                </div>
                <div class="calc-run-meta">
                  <span class="calc-run-meta__label">{{ t('執行編號', 'Run ID') }}</span>
                  <strong class="calc-run-meta__value">{{ result.calcRunId }}</strong>
                </div>
              </div>

              <div v-if="result.renewable" class="calc-output-card">
              <h3>{{ t('再生能源加成 (3-8)', 'Renewable Bonus (3-8)') }}</h3>
                <pre class="calc-code">{{ toPrettyJson(result.renewable) }}</pre>
              </div>
            </div>

            <div v-if="result.nzb" class="calc-output-card calc-output-card--wide">
              <h3>{{ t('NZB 評估 (3-9)', 'NZB Evaluate (3-9)') }}</h3>
              <pre class="calc-code">{{ toPrettyJson(result.nzb) }}</pre>
            </div>

            <div class="calc-formulas-used">
              <h3>{{ t('使用公式', 'Formulas Used') }}</h3>
              <div class="calc-formula-tags">
                <span v-for="f in result.formulasUsed" :key="f" class="calc-formula-tag">{{ f }}</span>
              </div>
            </div>
          </template>
        </section>
      </div>

      <section v-if="result" class="calc-trace-section">
        <div class="calc-section-title">
          <span class="calc-section-title__icon">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M7 7h10M7 12h10M7 17h6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
            </svg>
          </span>
          <div>
            <h2>{{ t('公式追蹤', 'Formulas Trace') }}</h2>
            <p>{{ t('逐步顯示本次計算的審核與運算流程。', 'Step-by-step audit log of the calculation process.') }}</p>
          </div>
        </div>

        <div class="calc-trace-card">
          <div v-for="(step, idx) in result.traceSteps" :key="idx" class="calc-trace-step">
            <div class="calc-trace-step__index">{{ Number(idx) + 1 }}</div>
            <div class="calc-trace-step__body">
              <p class="calc-trace-step__title">{{ step.description }}</p>
              <pre class="calc-code">{{ toPrettyJson(step.result) }}</pre>
            </div>
          </div>
        </div>

        <div class="calc-evidence-card">
          <div class="calc-evidence-card__header">
            <div>
              <h3>{{ t('政府提交證據包', 'Government Evidence Pack') }}</h3>
              <p>{{ t('包含本次計算所需之請求、回應與執行明細。', 'Contains all requests/responses and run-details lookup for audit.') }}</p>
            </div>
            <button class="calc-secondary-button" @click="downloadEvidence">{{ t('下載證據 JSON', 'Download Evidence JSON') }}</button>
          </div>
          <pre class="calc-code">{{ toPrettyJson(result.runDetails) }}</pre>
        </div>
      </section>
    </section>
  </main>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import { logout } from '../auth';
import LanguageToggle from '../components/LanguageToggle.vue';
import { useI18n } from '../i18n';
import { navigate } from '../nav';

// Frontend -> API URL by environment:
// - Development UI (local Vite frontend): use `http://localhost:8080`
// - Testing UI (Zeabur frontend): `.env.production` sets `VITE_API_URL=https://calengine-api.zeabur.app`
// - Production UI: set `VITE_API_URL` to the future production API URL
const API_BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) || 'http://localhost:8080';
const { t } = useI18n();

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
  beta1:  0.474,
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
const activePreset = ref<'case1' | 'case2' | 'case3' | 'case4'>('case1');

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
  activePreset.value = key;
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
    error.value = e instanceof Error ? e.message : t('發生未預期錯誤。', 'Unexpected error');
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

<style scoped>
.calc-page svg {
  display: block;
  max-width: 100%;
  max-height: 100%;
}

.calc-page {
  min-height: 100vh;
  padding: 18px 14px 24px;
  background: #f5f7fb;
  color: #1e293b;
  font-family: var(--ui-font-sans);
}

.calc-card {
  width: min(1240px, 100%);
  margin: 0 auto;
  background: #fff;
  border: 1px solid #e3ebf7;
  border-radius: 14px;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.06);
  overflow: hidden;
}

.calc-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  padding: 14px 20px;
  border-bottom: 1px solid #e9eef7;
  background: #fff;
}

.calc-brand {
  display: flex;
  align-items: center;
  gap: 8px;
}

.calc-brand__logo {
  width: 24px;
  height: 24px;
  color: #0f6bdc;
  flex: 0 0 auto;
}

.calc-brand__text {
  display: flex;
  align-items: baseline;
  gap: 6px;
}

.calc-brand__name {
  margin: 0;
  font-size: var(--text-sm);
  font-weight: 800;
  color: #0f6bdc;
}

.calc-brand__version {
  margin: 0;
  font-size: var(--text-2xs);
  color: #94a3b8;
}

.calc-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.calc-toolbar__group {
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

.calc-link {
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

.calc-toolbar__group .calc-link + .calc-link {
  border-left: 1px solid #edf2f8;
}

.calc-link--danger {
  color: #ef4444;
}

.calc-avatar {
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

.calc-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
  padding: 20px 24px 16px;
  border-bottom: 1px solid #eef2f8;
}

.calc-presets {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.calc-chip {
  border: 1px solid #dbe7fa;
  background: #fff;
  color: #111827;
  border-radius: 999px;
  padding: 6px 12px;
  font-size: var(--text-xs);
  font-weight: 700;
  cursor: pointer;
  transition: background-color 0.16s ease, border-color 0.16s ease, color 0.16s ease, box-shadow 0.16s ease;
}

.calc-chip--active {
  color: #2f80ed;
  border-color: #c8dcff;
  background: #f9fbff;
  box-shadow: 0 6px 16px rgba(47, 128, 237, 0.08);
}

.calc-body {
  display: grid;
  grid-template-columns: 320px minmax(0, 1fr);
  gap: 16px;
  padding: 20px 24px 22px;
}

.calc-input,
.calc-output {
  min-width: 0;
}

.calc-panel-heading {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 14px;
}

.calc-panel-heading__icon {
  width: 22px;
  height: 22px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  background: #eef5ff;
  color: #5ba4ff;
  flex: 0 0 auto;
}

.calc-panel-heading__icon svg {
  width: 12px;
  height: 12px;
}

.calc-panel-heading h2 {
  margin: 0;
  font-size: var(--text-xl);
  font-weight: 800;
}

.calc-panel-heading p {
  margin: 2px 0 0;
  font-size: var(--text-xs);
  color: #64748b;
}

.calc-form-grid {
  display: grid;
  gap: 12px;
}

.field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.field {
  display: grid;
  gap: 5px;
}

.field span {
  font-size: var(--text-xs);
  font-weight: 700;
  color: #475569;
}

.field input,
.field select {
  width: 100%;
  min-width: 0;
  height: 36px;
  border: 1px solid #d8e3f2;
  border-radius: 9px;
  background: #fff;
  padding: 0 11px;
  color: #0f172a;
  font-size: var(--text-sm);
}

.calc-subsection {
  border: 1px solid #e6edf8;
  border-radius: 11px;
  background: #fbfdff;
  padding: 12px;
}

.calc-subsection h3 {
  margin: 0 0 8px;
  font-size: var(--text-sm);
  font-weight: 800;
}

.hint {
  margin: 0 0 8px;
  font-size: var(--text-xs);
  color: #64748b;
}

.field--toggle {
  align-content: center;
  min-height: 36px;
}

.field-toggle {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 36px;
}

.field-toggle > span {
  font-size: var(--text-xs);
  line-height: 1.35;
}

.field-toggle input[type='checkbox'] {
  width: 13px;
  height: 13px;
  min-width: 13px;
  min-height: 13px;
  margin: 0;
  padding: 0;
  accent-color: #2f80ed;
  transform: translateY(-1px);
}

.calc-run-button {
  width: 100%;
  height: 40px;
  border: 0;
  border-radius: 9px;
  background: linear-gradient(180deg, #36a2ff 0%, #1686f0 100%);
  color: #fff;
  font-size: var(--text-sm);
  font-weight: 800;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
}

.calc-run-button:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.calc-run-button__icon {
  font-size: var(--text-xs);
}

.calc-error {
  margin: 8px 0 0;
  color: #b91c1c;
  font-size: var(--text-xs);
  font-weight: 700;
}

.calc-placeholder {
  min-height: 180px;
  display: grid;
  place-items: center;
  border: 1px dashed #d8e3f2;
  border-radius: 12px;
  color: #94a3b8;
  font-size: var(--text-sm);
}

.calc-metric-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 14px;
}

.calc-metric-card {
  border: 1px solid #dfe9f7;
  border-radius: 11px;
  background: #fff;
  padding: 12px;
  min-height: 76px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.calc-metric-card--accent {
  background: #eaf4ff;
}

.calc-metric-card span {
  font-size: var(--text-2xs);
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
}

.calc-metric-card strong {
  font-size: var(--text-2xl);
  line-height: 1;
  font-weight: 900;
  color: #111827;
}

.calc-output-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  gap: 14px;
  margin-bottom: 14px;
}

.calc-output-card {
  border: 1px solid #e6edf8;
  border-radius: 12px;
  background: #fff;
  padding: 14px;
}

.calc-output-card--wide {
  margin-bottom: 10px;
}

.calc-output-card h3,
.calc-formulas-used h3,
.calc-evidence-card h3 {
  margin: 0 0 8px;
  font-size: var(--text-xs);
  font-weight: 800;
}

.calc-breakdown-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px 18px;
}

.calc-breakdown-grid p {
  margin: 0;
  display: flex;
  justify-content: space-between;
  gap: 8px;
  font-size: var(--text-xs);
}

.calc-breakdown-grid p span {
  color: #64748b;
}

.calc-breakdown-grid p strong {
  color: #0f172a;
  font-weight: 800;
}

.calc-run-meta {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid #eef2f8;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.calc-run-meta__label {
  font-size: var(--text-xs);
  font-weight: 700;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.calc-run-meta__value {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  background: #f8fbff;
  border: 1px solid #dbe7fa;
  color: #0f172a;
  font-size: var(--text-xs);
  font-weight: 800;
  max-width: 100%;
  overflow-wrap: anywhere;
}

.calc-code {
  margin: 0;
  min-height: 96px;
  max-height: 180px;
  overflow: auto;
  border-radius: 8px;
  background: #030919;
  color: #f8fafc;
  padding: 11px 13px;
  font-size: var(--text-xs);
  line-height: 1.55;
  font-family: var(--ui-font-mono);
}

.calc-formulas-used {
  margin-top: 8px;
}

.calc-formula-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.calc-formula-tag {
  border: 1px solid #dde6f4;
  border-radius: 999px;
  background: #fff;
  padding: 5px 8px;
  font-size: var(--text-2xs);
  font-weight: 700;
  color: #475569;
}

.calc-trace-section {
  padding: 0 24px 20px;
}

.calc-section-title {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin: 4px 0 12px;
}

.calc-section-title__icon {
  width: 20px;
  height: 20px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  background: #eef5ff;
  color: #5ba4ff;
  flex: 0 0 auto;
}

.calc-section-title__icon svg {
  width: 11px;
  height: 11px;
}

.calc-section-title h2 {
  margin: 0;
  font-size: var(--text-xl);
  font-weight: 800;
}

.calc-section-title p {
  margin: 2px 0 0;
  font-size: var(--text-xs);
  color: #64748b;
}

.calc-trace-card,
.calc-evidence-card {
  border: 1px solid #e6edf8;
  border-radius: 12px;
  background: #fff;
  padding: 15px;
}

.calc-trace-card {
  margin-bottom: 12px;
}

.calc-trace-step {
  display: grid;
  grid-template-columns: 16px minmax(0, 1fr);
  gap: 12px;
  align-items: start;
  margin-bottom: 10px;
}

.calc-trace-step:last-child {
  margin-bottom: 0;
}

.calc-trace-step__index {
  width: 16px;
  height: 16px;
  border: 1px solid #4aa3ff;
  border-radius: 999px;
  color: #2f80ed;
  font-size: 0.5rem;
  font-weight: 800;
  display: grid;
  place-items: center;
  margin-top: 2px;
}

.calc-trace-step__title {
  margin: 0 0 6px;
  font-size: var(--text-xs);
  font-weight: 700;
  color: #0f172a;
}

.calc-evidence-card__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 8px;
}

.calc-evidence-card__header p {
  margin: 2px 0 0;
  font-size: var(--text-xs);
  color: #64748b;
}

.calc-secondary-button {
  flex: 0 0 auto;
  border: 1px solid #dbe6f6;
  background: #f8fbff;
  color: #2f80ed;
  border-radius: 8px;
  height: 30px;
  padding: 0 10px;
  font-size: var(--text-xs);
  font-weight: 700;
  cursor: pointer;
}

@media (max-width: 1100px) {
  .calc-body {
    grid-template-columns: 280px minmax(0, 1fr);
  }

  .calc-metric-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 960px) {
  .calc-page {
    padding: 14px 10px 18px;
  }

  .calc-body {
    grid-template-columns: 1fr;
  }

  .calc-metric-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .calc-output-grid {
    grid-template-columns: 1fr;
  }

  .calc-topbar,
  .calc-header,
  .calc-evidence-card__header {
    flex-direction: column;
    align-items: flex-start;
  }

  .calc-topbar,
  .calc-header,
  .calc-body,
  .calc-trace-section {
    padding-left: 18px;
    padding-right: 18px;
  }

  .calc-toolbar {
    width: 100%;
    justify-content: flex-start;
  }

  .calc-toolbar__group {
    flex-wrap: wrap;
    row-gap: 8px;
    min-height: auto;
    padding: 10px 12px;
  }
}

@media (max-width: 720px) {
  .calc-page {
    padding: 10px 8px 14px;
  }

  .calc-card {
    border-radius: 12px;
  }

  .calc-topbar,
  .calc-header,
  .calc-body,
  .calc-trace-section {
    padding-left: 14px;
    padding-right: 14px;
  }

  .calc-topbar,
  .calc-header {
    gap: 12px;
  }

  .calc-link {
    padding: 0 12px;
  }

  .field-grid,
  .calc-breakdown-grid {
    grid-template-columns: 1fr;
  }

  .calc-output-card {
    padding: 12px;
  }

  .calc-run-meta {
    flex-direction: column;
    align-items: flex-start;
  }

  .calc-evidence-card__header {
    gap: 10px;
  }

  .calc-secondary-button {
    width: 100%;
  }
}

@media (max-width: 560px) {
  .calc-topbar,
  .calc-header,
  .calc-body,
  .calc-trace-section {
    padding-left: 12px;
    padding-right: 12px;
  }

  .calc-toolbar,
  .calc-toolbar__group {
    width: 100%;
  }

  .calc-toolbar__group {
    justify-content: flex-start;
  }

  .calc-link {
    flex: 1 1 auto;
    min-width: 0;
    justify-content: center;
    text-align: center;
  }

  .calc-avatar {
    align-self: flex-end;
  }

  .calc-metric-grid {
    grid-template-columns: 1fr;
  }

  .calc-metric-card {
    min-height: 68px;
  }

  .calc-output-grid {
    gap: 12px;
  }

  .calc-code {
    min-height: 84px;
    max-height: 160px;
    padding: 10px 11px;
  }

  .calc-formula-tags {
    gap: 5px;
  }

  .calc-trace-step {
    grid-template-columns: 14px minmax(0, 1fr);
    gap: 10px;
  }
}
</style>
