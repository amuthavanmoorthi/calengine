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
        <div class="calc-run-summary">
          <div>
            <span>{{ t('模式', 'Mode') }}</span>
            <strong>{{ efficiencyModeLabel }}</strong>
          </div>
          <div>
            <span>{{ t('用途類別', 'Use Category') }}</span>
            <strong>{{ selectedUseCategoryName }}</strong>
          </div>
          <div>
            <span>{{ t('評估面積 AFe', 'Evaluated Area AFe') }}</span>
            <strong>{{ effectiveFloorArea.toLocaleString() }} m²</strong>
          </div>
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
              <p>{{ t('依 BERSn 2024 手冊第三章步驟順序設定參數。', 'Follow BERSn 2024 Manual Chapter 3 step order to configure parameters.') }}</p>
            </div>
          </div>

          <!-- Legend -->
          <div class="calc-legend">
            <span class="badge badge--lookup">{{ t('查表值', 'Lookup') }}</span> {{ t('由標準表格查取，系統自動填入', 'From standard table, auto-filled') }}
            &nbsp;|&nbsp;
            <span class="badge badge--manual">{{ t('手動輸入', 'Manual') }}</span> {{ t('需使用者自行填寫', 'User must enter') }}
            &nbsp;|&nbsp;
            <span class="badge badge--calc">{{ t('計算結果', 'Calculated') }}</span> {{ t('由公式推導，不可手動改', 'Derived from formula') }}
          </div>

          <div class="calc-form-grid">

          <!-- ── STEP 1: Basics ── -->
          <div class="calc-step-header">
            <span class="calc-step-num">Step 1–2</span>
            <span>{{ t('地區 / 用途 / 面積', 'Region / Use Category / Floor Area') }}</span>
          </div>
          <div class="field-grid">
            <label class="field">
              <span>{{ t('分支類型', 'Branch Type') }}</span>
              <select v-model="form.branchType">
                <option value="general">{{ t('一般建築', 'General Building') }}</option>
                <option value="hotwater">{{ t('含中央熱水系統', 'With Central Hot Water') }}</option>
              </select>
              <small class="field-help">{{ t('含中央熱水時啟用 §3-3-2 HpEUI 計算。', 'Enables §3-3-2 HpEUI calculation when central hot water exists.') }}</small>
            </label>

            <label class="field">
              <span>{{ t('效率輸入模式', 'Efficiency Input Mode') }}</span>
              <select v-model="form.efficiencyMode">
                <option value="manual">{{ t('手動輸入（直接給 EEV/EAC/EL）', 'Manual — provide EEV/EAC/EL directly') }}</option>
                <option value="auto">{{ t('DB/JSON 後端計算（附錄二查表）', 'DB/JSON — backend computes from Appendix 2 tables') }}</option>
              </select>
              <small class="field-help">
                <span class="badge badge--manual">{{ t('手動', 'Manual') }}</span>
                {{ t('選「手動」時您直接給定EEV/EAC/EL值。選「DB/JSON」時後端依附錄二公式計算。', 'Manual: you supply EEV/EAC/EL. DB/JSON: backend computes from Appendix 2.') }}
              </small>
            </label>

            <label class="field">
              <span>
                <span class="badge badge--lookup">{{ t('查表', 'Lookup') }}</span>
                {{ t('Step 2 — 建築用途類別', 'Step 2 — Building Use Category') }}
              </span>
              <select v-model="form.buildingType">
                <option
                  v-for="category in bersUseCategories"
                  :key="category.id"
                  :value="category.id"
                  :disabled="category.status === 'pending_crosswalk'"
                >
                  {{ t(category.labelZh, category.labelEn) }}{{ category.status === 'pending_crosswalk' ? t('（待對照）', ' (pending crosswalk)') : '' }}
                </option>
              </select>
              <small class="field-help">
                {{ selectedUseCategory?.status === 'pending_crosswalk'
                  ? t('此類別尚缺附錄一基準對照，需補齊後才能正式計算。', 'This category still needs Appendix 1 baseline crosswalk before formal calculation.')
                  : t('查 BERSn 2024 附錄一與表 3.2 → 自動取得 AEUI、LEUI、EEUI。', 'Looked up from BERSn 2024 Appendix 1 + Table 3.2 → auto-fills AEUI, LEUI, EEUI.') }}
              </small>
            </label>

            <label class="field">
              <span>
                <span class="badge badge--manual">{{ t('手動', 'Manual') }}</span>
                {{ t('Step 3 — 總樓地板面積 AF (m²)', 'Step 3 — Total Floor Area AF (m²)') }}
              </span>
              <input v-model.number="form.totalFloorArea" type="number" min="1" step="0.1" />
              <small class="field-help">{{ t('依建築執照圖面填入，§3-1-1。AFe = AF − 排除面積。', 'From building permit drawings, §3-1-1. AFe = AF − excluded areas.') }}</small>
            </label>

            <label class="field">
              <span>
                <span class="badge badge--manual">{{ t('手動', 'Manual') }}</span>
                {{ t('Step 3.1 — 免評估分區面積 AFk (m²)', 'Step 3.1 — Exempt Zone Area AFk (m²)') }}
              </span>
              <input v-model.number="form.excludedArea" type="number" min="0" step="0.1" />
              <small class="field-help">{{ t('室外樓地板、防空避難、停車場、無空調儲藏室≥100m²，§3-1-2。', 'Outdoor, civil defense, parking, storage ≥100m² w/o AC, §3-1-2.') }}</small>
            </label>
          </div>

          <!-- ── STEP 2: EUI Baselines (lookup from building type) ── -->
          <div class="calc-step-header">
            <span class="calc-step-num">Step 2</span>
            <span>{{ t('EUI 基準值（查表 3-2）', 'EUI Baselines (Table 3-2 Lookup)') }}</span>
          </div>
          <div class="field-grid">
            <label class="field">
              <span>
                <span class="badge badge--lookup">{{ t('查表', 'Lookup') }}</span>
                {{ t('空調基準能耗 AEUI (kWh/m²·yr)', 'HVAC Baseline AEUI (kWh/m²·yr)') }}
              </span>
              <input v-model.number="form.aeui" type="number" min="0" step="0.01" />
              <small class="field-help">{{ t('由建築類型自動查表 3-2 取得，一般無需手動修改。', 'Auto-retrieved from Table 3-2 by building type. Do not modify unless overriding.') }}</small>
            </label>

            <label class="field">
              <span>
                <span class="badge badge--lookup">{{ t('查表', 'Lookup') }}</span>
                {{ t('照明基準能耗 LEUI (kWh/m²·yr)', 'Lighting Baseline LEUI (kWh/m²·yr)') }}
              </span>
              <input v-model.number="form.leui" type="number" min="0" step="0.01" />
              <small class="field-help">{{ t('由建築類型自動查表 3-2 取得。', 'Auto-retrieved from Table 3-2 by building type.') }}</small>
            </label>

            <label class="field">
              <span>
                <span class="badge badge--lookup">{{ t('查表', 'Lookup') }}</span>
                {{ t('設備基準能耗 EEUI (kWh/m²·yr)', 'Equipment Baseline EEUI (kWh/m²·yr)') }}
              </span>
              <input v-model.number="form.eeui" type="number" min="0" step="0.01" />
              <small class="field-help">{{ t('由建築類型自動查表 3-2 取得。', 'Auto-retrieved from Table 3-2 by building type.') }}</small>
            </label>

            <label class="field">
              <span>
                <span class="badge badge--lookup">{{ t('查表', 'Lookup') }}</span>
                {{ t('Step 1 — 地區係數 UR', 'Step 1 — Regional Factor UR') }}
              </span>
              <input v-model.number="form.ur" type="number" min="0" max="2" step="0.01" />
              <small class="field-help">{{ t('由地理分區查附錄一表A取得（A區=1.0, B區=0.95, …）。', 'From Appendix 1 Table A by climate region (Zone A=1.0, B=0.95, …).') }}</small>
            </label>
          </div>

          <!-- ── STEP 3: Manual mode EEV/EAC/EL ── -->
          <template v-if="form.efficiencyMode === 'manual'">
          <div class="calc-step-header">
            <span class="calc-step-num">Step 4–9</span>
            <span>{{ t('手動輸入模式 — 直接給定效率指標', 'Manual Mode — Provide efficiency indicators directly') }}</span>
          </div>
          <div class="field-grid">
              <label class="field">
                <span>
                  <span class="badge badge--manual">{{ t('手動', 'Manual') }}</span>
                  {{ t('Step 7 — 外殼效率指標 EEV', 'Step 7 — Envelope Efficiency Value EEV') }}
                </span>
                <input v-model.number="form.eev" type="number" min="0" max="5" step="0.001" />
                <small class="field-help">{{ t('公式: EEV=Σ(Uaw×Aaw+Ui×ηi×Ki×Aaf+Uar×Aar)/(ΣA)，附錄二公式1–5。', 'Formula: EEV=Σ(Uaw×Aaw+Ui×ηi×Ki×Aaf+Uar×Aar)/(ΣA), Appendix 2 Formulas 1–5.') }}</small>
              </label>
              <label class="field">
                <span>
                  <span class="badge badge--manual">{{ t('手動', 'Manual') }}</span>
                  {{ t('Step 8 — 空調效率指標 EAC', 'Step 8 — HVAC Efficiency Coefficient EAC') }}
                </span>
                <input v-model.number="form.eac" type="number" min="0" max="2" step="0.01" />
                <small class="field-help">{{ t('中央空調: 1−(BW×HT×Arx)；個別: 0.9×(1−Arx)。附錄二公式15–16b。', 'Central: 1−(BW×HT×Arx); Individual: 0.9×(1−Arx). Appendix 2 Formulas 15–16b.') }}</small>
              </label>
              <label class="field">
                <span>
                  <span class="badge badge--manual">{{ t('手動', 'Manual') }}</span>
                  {{ t('Step 9 — 照明效率指標 EL', 'Step 9 — Lighting Efficiency Coefficient EL') }}
                </span>
                <input v-model.number="form.el" type="number" min="0" max="2" step="0.01" />
                <small class="field-help">{{ t('公式: EL=β×(LPD設計/LPD基準)，β查表10，LPD基準查表11。', 'Formula: EL=β×(LPD_design/LPD_base), β from Table 10, LPD_base from Table 11.') }}</small>
              </label>
          </div>
          </template>

          <!-- ── STEP 4-9: MEP Coefficients (always needed) ── -->
          <div class="calc-step-header">
            <span class="calc-step-num">Step 8–10</span>
            <span>{{ t('MEP 效率係數（Es / Et / β₁ / CFn）', 'MEP Efficiency Coefficients (Es / Et / β₁ / CFn)') }}</span>
          </div>
          <div class="field-grid">
            <label class="field">
              <span>
                <span class="badge badge--lookup">{{ t('查表', 'Lookup') }}</span>
                {{ t('外殼-空調交互係數 Es (表 3-2)', 'Envelope-HVAC Interaction Factor Es (Table 3-2)') }}
              </span>
              <input v-model.number="form.es" type="number" min="0" max="3" step="0.01" />
              <small class="field-help">{{ t('由建築類型查表3-2取得，用於EEI公式中a×(EAC−EEV×Es)。', 'From building type in Table 3-2. Used in EEI formula: a×(EAC−EEV×Es).') }}</small>
            </label>

            <label class="field">
              <span>
                <span class="badge badge--lookup">{{ t('查表', 'Lookup') }}</span>
                {{ t('Step 10 — 電梯效率係數 Et', 'Step 10 — Elevator Efficiency Factor Et') }}
              </span>
              <input v-model.number="form.et" type="number" min="0" max="2" step="0.01" />
              <small class="field-help">{{ t('ACVV=1.0, VVVF齒輪=0.6, VVVF永磁=0.5, 回生=0.4。§3-3-1。', 'ACVV=1.0, VVVF gear=0.6, VVVF perm=0.5, Regen=0.4. §3-3-1.') }}</small>
            </label>

            <label class="field">
              <span>
                <span class="badge badge--manual">{{ t('手動', 'Manual') }}</span>
                {{ t('Step 10 — 電梯台數 Nej', 'Step 10 — Elevator Count Nej') }}
              </span>
              <input v-model.number="form.elevatorCount" type="number" min="1" max="100" step="1" />
              <small class="field-help">{{ t('建築內電梯總台數，用於 EtEUI=0.6×Σ(Nej×Eelj×YOHj)/AFe。', 'Total elevator count. Used in EtEUI=0.6×Σ(Nej×Eelj×YOHj)/AFe.') }}</small>
            </label>

            <label class="field">
              <span>
                <span class="badge badge--lookup">{{ t('查表', 'Lookup') }}</span>
                {{ t('電梯單位能耗 Eelj (kWh/台·hr) [表 3-1]', 'Elevator Unit Energy Eelj (kWh/car·hr) [Table 3-1]') }}
              </span>
              <input v-model.number="form.eelj" type="number" min="0" max="10" step="0.01" />
              <small class="field-help">{{ t('由電梯類型+容量查表3-1取得參考值，可依實際規格調整。', 'Reference value from Table 3-1 by elevator type + capacity. Adjust to actual specs.') }}</small>
            </label>

            <label class="field">
              <span>
                <span class="badge badge--manual">{{ t('手動', 'Manual') }}</span>
                {{ t('年運轉時數 YOHj (hr/年)', 'Annual Operating Hours YOHj (hr/yr)') }}
              </span>
              <input v-model.number="form.yohj" type="number" min="0" max="8760" step="1" />
              <small class="field-help">{{ t('電梯年實際運轉時數，依建築使用特性評估。一般辦公約 2500–3500 hr/yr。', 'Annual elevator operation hours. Typical office: 2500–3500 hr/yr.') }}</small>
            </label>

            <label class="field">
              <span>
                <span class="badge badge--lookup">{{ t('查表', 'Lookup') }}</span>
                {{ t('Step 9 — 照明管理係數 β₁ (表 10)', 'Step 9 — Lighting Management Factor β₁ (Table 10)') }}
              </span>
              <input v-model.number="form.beta1" type="number" min="0.0001" max="1.0" step="0.001" />
              <small class="field-help">{{ t('BEMS整合=0.75, 調光=0.80, 自動點滅=0.90, 合理迴路=0.95, 無=1.0。附錄二表10。', 'BEMS=0.75, Dimming=0.80, Auto=0.90, Circuit=0.95, None=1.0. Appendix 2 Table 10.') }}</small>
            </label>

            <label class="field">
              <span>
                <span class="badge badge--lookup">{{ t('查表', 'Lookup') }}</span>
                {{ t('碳排放係數 CFn (kgCO₂/kWh)', 'Carbon Emission Factor CFn (kgCO₂/kWh)') }}
              </span>
              <input v-model.number="form.cfn" type="number" min="0.0001" max="2.0" step="0.01" />
              <small class="field-help">{{ t('台灣電網排放係數，依台電年度公告值填入（約 0.509 kgCO₂/kWh）。', 'Taiwan grid emission factor per Taipower annual announcement (approx 0.509 kgCO₂/kWh).') }}</small>
            </label>
          </div>

          <div v-if="form.efficiencyMode === 'auto'" class="calc-subsection">
            <div class="calc-step-header">
              <span class="calc-step-num">Step 4–7</span>
              <span>{{ t('DB/JSON 後端計算 — 外殼與MEP參數', 'DB/JSON Backend — Envelope & MEP Parameters') }}</span>
            </div>
            <p class="hint">{{ t('以下參數由後端依附錄二公式計算 EEV / EAC / EL，無需手動給定效率值。', 'Backend computes EEV/EAC/EL from Appendix 2 formulas using the inputs below.') }}</p>

            <!-- Step 4: Envelope -->
            <h4 class="calc-subsection-label">{{ t('Step 4–7：外殼參數（EEV計算依據）', 'Steps 4–7: Envelope Parameters (for EEV calculation)') }}</h4>
            <div class="field-grid">
              <label class="field">
                <span>
                  <span class="badge badge--manual">{{ t('手動', 'Manual') }}</span>
                  {{ t('外牆面積 Aaw (m²)', 'Wall Area Aaw (m²)') }}
                </span>
                <input v-model.number="form.wallArea" type="number" min="1" step="0.1" />
                <small class="field-help">{{ t('外牆總面積（扣除窗戶），由建築圖面量取。', 'Total opaque wall area (excl. windows), from building drawings.') }}</small>
              </label>
              <label class="field">
                <span>
                  <span class="badge badge--manual">{{ t('手動', 'Manual') }}</span>
                  {{ t('窗戶面積 Aaf (m²)', 'Window Area Aaf (m²)') }}
                </span>
                <input v-model.number="form.windowArea" type="number" min="0" step="0.1" />
                <small class="field-help">{{ t('全棟窗戶面積總和。WWR = Aaf/(Aaw+Aaf)。', 'Total window area. WWR = Aaf/(Aaw+Aaf).') }}</small>
              </label>
              <label class="field">
                <span>
                  <span class="badge badge--calc">{{ t('計算', 'Calculated') }}</span>
                  {{ t('海拔高度 (m)', 'Altitude (m)') }}
                </span>
                <input v-model.number="form.altitudeM" type="number" min="0" max="4000" step="1" />
                <small class="field-help">{{ t('建築基地海拔，影響EVc/EVmin合規門檻（附錄二表1）。', 'Site altitude — affects EVc/EVmin compliance thresholds (Appendix 2 Table 1).') }}</small>
              </label>
              <label class="field">
                <span>
                  <span class="badge badge--lookup">{{ t('查表', 'Lookup') }}</span>
                  {{ t('Step 1 — 氣候分區', 'Step 1 — Climate Zone') }}
                </span>
                <select v-model="form.climateZone">
                  <option value="SOUTH">{{ t('南部 SOUTH', 'SOUTH') }}</option>
                  <option value="NORTH">{{ t('北部 NORTH', 'NORTH') }}</option>
                </select>
                <small class="field-help">{{ t('影響窗平均熱傳透率 UAF 門檻值（附錄二表1）。', 'Affects window UAF threshold (Appendix 2 Table 1).') }}</small>
              </label>
              <label class="field">
                <span>
                  <span class="badge badge--lookup">{{ t('查表', 'Lookup') }}</span>
                  {{ t('建築群組 (用於EV查表)', 'Building Group (for EV table lookup)') }}
                </span>
                <input v-model="form.buildingGroup" type="text" placeholder="e.g. general_commercial" />
                <small class="field-help">{{ t('用於查對應 EV 基準值，依建築主要用途決定。', 'Used to look up EV baseline value by primary building use.') }}</small>
              </label>
              <label class="field">
                <span>EV</span>
                <input v-model.number="form.ev" type="number" min="0" step="0.001" />
                <small class="field-help">{{ t('外殼效能值 EV，通常由後端依 WWR 及構造查表計算。', 'Envelope performance value EV, usually backend-computed from WWR and constructions.') }}</small>
              </label>
            </div>

            <!-- Step 8: HVAC -->
            <h4 class="calc-subsection-label">{{ t('Step 8：空調系統（EAC計算方法）', 'Step 8: HVAC System (EAC calculation method)') }}</h4>
            <div class="field-grid">
            <label class="field">
              <span>
                <span class="badge badge--lookup">{{ t('查表', 'Lookup') }}</span>
                {{ t('EAC 計算方法（附錄二§4）', 'EAC Calculation Method (Appendix 2 §4)') }}
              </span>
              <select v-model="form.eacMethod">
                  <option value="central_le_50">{{ t('中央空調 ≤50USRT (公式15)', 'Central AC ≤50USRT (Formula 15)') }}</option>
                  <option value="central_gt_50">{{ t('中央空調 >50USRT (公式14)', 'Central AC >50USRT (Formula 14)') }}</option>
                  <option value="noncentral_chiller">{{ t('個別空調 (公式16b)', 'Individual AC (Formula 16b)') }}</option>
                </select>
              <small class="field-help">{{ t('EAC 公式依空調類型及規模選擇，中央≤50USRT用公式15，個別用16b。', 'Select EAC formula by AC type: central ≤50USRT=Formula 15, individual=16b.') }}</small>
              </label>
            </div>

            <!-- Step 9: Lighting -->
            <h4 class="calc-subsection-label">{{ t('Step 9：照明系統（EL計算）', 'Step 9: Lighting System (EL calculation)') }}</h4>
            <div class="field-grid">
            <label class="field">
              <span>
                <span class="badge badge--manual">{{ t('手動', 'Manual') }}</span>
                {{ t('EL 分子 Σ(β×LPD設計×A)', 'EL Numerator Σ(β×LPD_design×A)') }}
              </span>
              <input v-model.number="form.elNumeratorTotal" type="number" min="0" step="0.01" />
              <small class="field-help">{{ t('各空間 β×LPD設計×面積 之總和（W）。附錄二公式17。', 'Sum of β×LPD_design×area for each space (W). Appendix 2 Formula 17.') }}</small>
            </label>
            <label class="field">
              <span>
                <span class="badge badge--manual">{{ t('手動', 'Manual') }}</span>
                {{ t('EL 分母 Σ(LPD基準×A)', 'EL Denominator Σ(LPD_baseline×A)') }}
              </span>
              <input v-model.number="form.elDenominatorTotal" type="number" min="1" step="0.01" />
              <small class="field-help">{{ t('各空間 LPD基準×面積 之總和（W），LPD基準查表11。', 'Sum of LPD_baseline×area (W). LPD baseline from Table 11.') }}</small>
            </label>
            </div>

            <!-- Item 8 Fix: Custom wall/roof construction with k-value + thickness -->
            <h4 class="calc-subsection-label">{{ t('Step 4–5：自訂外牆/屋頂構造（k值＋厚度計算U值）', 'Steps 4–5: Custom Wall/Roof Construction (k-value + thickness → U-value)') }}</h4>
            <p class="hint">
              {{ t('公式：U = 1 / (Ri + Σ(d_i / λ_i) + Ro)', 'Formula: U = 1 / (Ri + Σ(d_i / λ_i) + Ro)') }}
              &nbsp;|&nbsp;
              {{ t('Ri（內表面熱阻）：外牆=0.11，屋頂=0.10 m²·K/W；Ro=0.04 m²·K/W', 'Ri (internal): wall=0.11, roof=0.10 m²·K/W; Ro=0.04 m²·K/W') }}
            </p>

            <div class="field-grid" style="margin-bottom:8px">
              <label class="field">
                <span>{{ t('外牆 Ri (m²·K/W)', 'Wall Ri (m²·K/W)') }}</span>
                <input v-model.number="form.customWallRi" type="number" min="0.01" max="0.5" step="0.01" :placeholder="'0.11'" />
              </label>
              <label class="field">
                <span>{{ t('外牆 Ro (m²·K/W)', 'Wall Ro (m²·K/W)') }}</span>
                <input v-model.number="form.customWallRo" type="number" min="0.01" max="0.5" step="0.01" :placeholder="'0.04'" />
              </label>
            </div>

            <div v-for="(layer, idx) in form.customWallLayers" :key="'wl'+idx" class="field-grid field-layer-row">
              <label class="field">
                <span>{{ t('外牆層', 'Wall Layer') }} {{ idx+1 }} — {{ t('材料', 'Material') }}</span>
                <input v-model="layer.material" type="text" :placeholder="t('例：RC混凝土', 'e.g. Reinforced Concrete')" />
              </label>
              <label class="field">
                <span>{{ t('厚度 d (mm)', 'Thickness d (mm)') }}</span>
                <input v-model.number="layer.thicknessMm" type="number" min="1" max="2000" step="1" />
              </label>
              <label class="field">
                <span>{{ t('導熱係數 λ (W/m·K)', 'Conductivity λ (W/m·K)') }}</span>
                <input v-model.number="layer.lambdaWmK" type="number" min="0.001" max="100" step="0.001" />
              </label>
              <label class="field field--inline">
                <span>{{ t('R_i = d/λ (m²·K/W)', 'R_i = d/λ (m²·K/W)') }}</span>
                <span class="badge badge--calc">{{ layer.thicknessMm && layer.lambdaWmK ? ((layer.thicknessMm/1000)/layer.lambdaWmK).toFixed(4) : '—' }}</span>
                <button type="button" class="btn-remove-layer" @click="form.customWallLayers.splice(idx,1)">✕</button>
              </label>
            </div>
            <div class="field-layer-actions">
              <button type="button" class="calc-btn-sm" @click="form.customWallLayers.push({material:'',thicknessMm:100,lambdaWmK:1.0})">
                + {{ t('新增外牆材料層', 'Add Wall Layer') }}
              </button>
              <span class="badge badge--calc" v-if="customWallU !== null">
                {{ t('計算 U 值', 'Calculated U') }} = {{ customWallU.toFixed(4) }} W/m²·K
              </span>
            </div>

            <div class="field-grid" style="margin:12px 0 8px">
              <label class="field">
                <span>{{ t('屋頂 Ri (m²·K/W)', 'Roof Ri (m²·K/W)') }}</span>
                <input v-model.number="form.customRoofRi" type="number" min="0.01" max="0.5" step="0.01" :placeholder="'0.10'" />
              </label>
              <label class="field">
                <span>{{ t('屋頂 Ro (m²·K/W)', 'Roof Ro (m²·K/W)') }}</span>
                <input v-model.number="form.customRoofRo" type="number" min="0.01" max="0.5" step="0.01" :placeholder="'0.04'" />
              </label>
            </div>

            <div v-for="(layer, idx) in form.customRoofLayers" :key="'rl'+idx" class="field-grid field-layer-row">
              <label class="field">
                <span>{{ t('屋頂層', 'Roof Layer') }} {{ idx+1 }} — {{ t('材料', 'Material') }}</span>
                <input v-model="layer.material" type="text" :placeholder="t('例：隔熱材', 'e.g. Insulation')" />
              </label>
              <label class="field">
                <span>{{ t('厚度 d (mm)', 'Thickness d (mm)') }}</span>
                <input v-model.number="layer.thicknessMm" type="number" min="1" max="2000" step="1" />
              </label>
              <label class="field">
                <span>{{ t('導熱係數 λ (W/m·K)', 'Conductivity λ (W/m·K)') }}</span>
                <input v-model.number="layer.lambdaWmK" type="number" min="0.001" max="100" step="0.001" />
              </label>
              <label class="field field--inline">
                <span>{{ t('R_i = d/λ (m²·K/W)', 'R_i = d/λ (m²·K/W)') }}</span>
                <span class="badge badge--calc">{{ layer.thicknessMm && layer.lambdaWmK ? ((layer.thicknessMm/1000)/layer.lambdaWmK).toFixed(4) : '—' }}</span>
                <button type="button" class="btn-remove-layer" @click="form.customRoofLayers.splice(idx,1)">✕</button>
              </label>
            </div>
            <div class="field-layer-actions">
              <button type="button" class="calc-btn-sm" @click="form.customRoofLayers.push({material:'',thicknessMm:100,lambdaWmK:1.0})">
                + {{ t('新增屋頂材料層', 'Add Roof Layer') }}
              </button>
              <span class="badge badge--calc" v-if="customRoofU !== null">
                {{ t('計算 U 值', 'Calculated U') }} = {{ customRoofU.toFixed(4) }} W/m²·K
              </span>
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
            <div
              v-if="result.outputs.EL_input?.EL_was_clamped"
              class="calc-warning-banner"
              role="alert"
            >
              <strong>{{ t('EL 自動調整提示', 'EL Auto-Adjusted Notice') }}</strong>
              <p>
                {{ t(
                  'EL is below the minimum allowable threshold. The system has automatically applied 0.4 according to the calculation rule.',
                  'EL is below the minimum allowable threshold. The system has automatically applied 0.4 according to the calculation rule.'
                ) }}
              </p>
              <p class="calc-warning-banner__values">
                {{ t('原始輸入 EL', 'Original EL input') }}:
                <strong>{{ format(result.outputs.EL_input.EL_original) }}</strong>
                &nbsp;→&nbsp;
                {{ t('實際採用 EL', 'EL used in calculation') }}:
                <strong>{{ format(result.outputs.EL_input.EL) }}</strong>
              </p>
            </div>

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

            <p class="calc-precision-note">
              {{ t(
                '精度說明：SCOREEE 以全精度 EEI 計算（不於計算過程中四捨五入至小數第二位），畫面顯示一律取至小數第三位；完整未捨入值請見證據軌跡。',
                'Precision policy: SCOREEE is computed from the full-precision EEI value (no rounding to 2dp during the calculation). On-screen values are rounded to 3 decimal places for display; the raw un-rounded values are recorded in the evidence trace.'
              ) }}
            </p>

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
import { computed, reactive, ref } from 'vue';
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

type BersUseCategory = {
  id: string;
  labelZh: string;
  labelEn: string;
  appendix1Code: string | null;
  calcBuildingType: string;
  hotwaterCategory: string | null;
  status: 'ready' | 'pending_crosswalk';
  table32Label: string;
};

const bersUseCategories: BersUseCategory[] = [
  { id: 'A1_ASSEMBLY_PERFORMANCE', labelZh: 'A-1 集會表演', labelEn: 'A-1 Assembly / Performance', appendix1Code: 'A1', calcBuildingType: 'A1', hotwaterCategory: null, status: 'ready', table32Label: 'A-1 之集會表演' },
  { id: 'A1_SPORTS_SPECIAL_VENUE', labelZh: 'A-1 體育專用場館', labelEn: 'A-1 Sports Special Venue', appendix1Code: 'A1', calcBuildingType: 'A1', hotwaterCategory: null, status: 'ready', table32Label: 'A-1 之體育專用場館' },
  { id: 'A2_INTERNATIONAL_TERMINAL', labelZh: 'A-2 國際航站', labelEn: 'A-2 International Terminal', appendix1Code: 'A2', calcBuildingType: 'A2', hotwaterCategory: null, status: 'ready', table32Label: 'A-2 之國際航站' },
  { id: 'A2_STATION_PORT_DOMESTIC_TERMINAL', labelZh: 'A-2 車站、船站、國內航站', labelEn: 'A-2 Station / Port / Domestic Terminal', appendix1Code: 'A2', calcBuildingType: 'A2', hotwaterCategory: null, status: 'ready', table32Label: 'A-2 車站、船站、國內航站' },
  { id: 'B1_ENTERTAINMENT', labelZh: 'B-1 娛樂場所', labelEn: 'B-1 Entertainment', appendix1Code: 'B1', calcBuildingType: 'B1', hotwaterCategory: null, status: 'ready', table32Label: 'B-1 娛樂場所' },
  { id: 'B2_DEPARTMENT_STORE', labelZh: 'B-2 商場百貨', labelEn: 'B-2 Department Store / Mall', appendix1Code: 'B2', calcBuildingType: 'B2', hotwaterCategory: null, status: 'ready', table32Label: 'B-2 商場百貨' },
  { id: 'B3_RESTAURANT', labelZh: 'B-3 餐飲場所', labelEn: 'B-3 Restaurant', appendix1Code: null, calcBuildingType: 'B3', hotwaterCategory: null, status: 'pending_crosswalk', table32Label: 'B-3 餐飲場所' },
  { id: 'B4_HOTEL', labelZh: 'B-4 旅館', labelEn: 'B-4 Hotel', appendix1Code: null, calcBuildingType: 'HOTEL', hotwaterCategory: 'hotel', status: 'pending_crosswalk', table32Label: 'B-4 旅館' },
  { id: 'C2_FACTORY_CLEAN_PRODUCTION', labelZh: 'C-2 清潔生產工廠', labelEn: 'C-2 Factory, Clean Production', appendix1Code: 'C2', calcBuildingType: 'C2', hotwaterCategory: null, status: 'ready', table32Label: 'C-2 之有清潔生產之工廠' },
  { id: 'C2_FACTORY_GENERAL_PRODUCTION', labelZh: 'C-2 一般生產工廠', labelEn: 'C-2 Factory, General Production', appendix1Code: 'C2', calcBuildingType: 'C2', hotwaterCategory: null, status: 'ready', table32Label: 'C-2 之一般生產之工廠' },
  { id: 'D1_FITNESS_LEISURE', labelZh: 'D-1 健身休閒', labelEn: 'D-1 Fitness / Leisure', appendix1Code: 'D1', calcBuildingType: 'D1', hotwaterCategory: 'fitness_leisure', status: 'ready', table32Label: 'D-1 之健身休閒' },
  { id: 'D1_SPORTS_SPECIAL_VENUE', labelZh: 'D-1 體育專用場館', labelEn: 'D-1 Sports Special Venue', appendix1Code: 'D1', calcBuildingType: 'D1', hotwaterCategory: null, status: 'ready', table32Label: 'D-1 之體育專用場館' },
  { id: 'D2_EDUCATION_CULTURE', labelZh: 'D-2 文教設施', labelEn: 'D-2 Education / Culture', appendix1Code: 'D2', calcBuildingType: 'D2', hotwaterCategory: null, status: 'ready', table32Label: 'D-2 之文教設施' },
  { id: 'D2_SPECIAL_FUNCTION_VENUE', labelZh: 'D-2 特殊功能場館', labelEn: 'D-2 Special Function Venue', appendix1Code: 'D2', calcBuildingType: 'D2', hotwaterCategory: null, status: 'ready', table32Label: 'D-2 之特殊功能場館' },
  // Building Use Group D-3/D-4 (K-12 教學設施) cross-walks to Appendix 1 Table A M-series by school level (M2 國小 / M3 國中 / M4 高中職、大專). Technical.pdf Appendix 1: M2=16/15/6, M3=21/21/8, M4=23/22/9.
  { id: 'M2_ELEMENTARY_TEACHING_OFFICE', labelZh: 'D-3/D-4 教學辦公樓 — M-2 國小', labelEn: 'D-3/D-4 Teaching Office — M-2 Elementary', appendix1Code: 'M2', calcBuildingType: 'M2', hotwaterCategory: null, status: 'ready', table32Label: 'D-3&D-4 之教學辦公公樓' },
  { id: 'M3_JUNIOR_HIGH_TEACHING_OFFICE', labelZh: 'D-3/D-4 教學辦公樓 — M-3 國中', labelEn: 'D-3/D-4 Teaching Office — M-3 Junior High', appendix1Code: 'M3', calcBuildingType: 'M3', hotwaterCategory: null, status: 'ready', table32Label: 'D-3&D-4 之教學辦公公樓' },
  { id: 'M4_SENIOR_COLLEGE_TEACHING_OFFICE', labelZh: 'D-3/D-4 教學辦公樓 — M-4 高中職/大專', labelEn: 'D-3/D-4 Teaching Office — M-4 Senior/College', appendix1Code: 'M4', calcBuildingType: 'M4', hotwaterCategory: null, status: 'ready', table32Label: 'D-3&D-4 之教學辦公公樓' },
  { id: 'M2_ELEMENTARY_D3_CLASSROOM', labelZh: 'D-3 乙教室 — M-2 國小', labelEn: 'D-3 Type B Classroom — M-2 Elementary', appendix1Code: 'M2', calcBuildingType: 'M2', hotwaterCategory: null, status: 'ready', table32Label: 'D-3 乙教室' },
  { id: 'M3_JUNIOR_HIGH_D3_CLASSROOM', labelZh: 'D-3 乙教室 — M-3 國中', labelEn: 'D-3 Type B Classroom — M-3 Junior High', appendix1Code: 'M3', calcBuildingType: 'M3', hotwaterCategory: null, status: 'ready', table32Label: 'D-3 乙教室' },
  { id: 'M4_SENIOR_COLLEGE_D3_CLASSROOM', labelZh: 'D-3 乙教室 — M-4 高中職/大專', labelEn: 'D-3 Type B Classroom — M-4 Senior/College', appendix1Code: 'M4', calcBuildingType: 'M4', hotwaterCategory: null, status: 'ready', table32Label: 'D-3 乙教室' },
  { id: 'M2_ELEMENTARY_D4_CLASSROOM', labelZh: 'D-4 乙教室 — M-2 國小', labelEn: 'D-4 Type B Classroom — M-2 Elementary', appendix1Code: 'M2', calcBuildingType: 'M2', hotwaterCategory: null, status: 'ready', table32Label: 'D-4 乙教室' },
  { id: 'M3_JUNIOR_HIGH_D4_CLASSROOM', labelZh: 'D-4 乙教室 — M-3 國中', labelEn: 'D-4 Type B Classroom — M-3 Junior High', appendix1Code: 'M3', calcBuildingType: 'M3', hotwaterCategory: null, status: 'ready', table32Label: 'D-4 乙教室' },
  { id: 'M4_SENIOR_COLLEGE_D4_CLASSROOM', labelZh: 'D-4 乙教室 — M-4 高中職/大專', labelEn: 'D-4 Type B Classroom — M-4 Senior/College', appendix1Code: 'M4', calcBuildingType: 'M4', hotwaterCategory: null, status: 'ready', table32Label: 'D-4 乙教室' },
  { id: 'D5_AFTERSCHOOL_CARE', labelZh: 'D-5 補教課後照顧機構', labelEn: 'D-5 Afterschool Care', appendix1Code: null, calcBuildingType: 'D5', hotwaterCategory: null, status: 'pending_crosswalk', table32Label: 'D-5 補教課後照顧機構' },
  { id: 'E_RELIGION_FUNERAL', labelZh: 'E 宗教殯儀設施', labelEn: 'E Religion / Funeral Facility', appendix1Code: null, calcBuildingType: 'E', hotwaterCategory: null, status: 'pending_crosswalk', table32Label: 'E 宗教殯儀設施' },
  { id: 'F1_DAYCARE_MEDICAL_CARE', labelZh: 'F-1 醫療照護（日照）', labelEn: 'F-1 Medical Care, Daycare', appendix1Code: 'F1', calcBuildingType: 'F1', hotwaterCategory: null, status: 'ready', table32Label: 'F-1 乙醫療照護(日照)' },
  { id: 'F1_HOSPITAL_LONG_TERM_CARE', labelZh: 'F-1 醫療照護（醫院、長照）', labelEn: 'F-1 Hospital / Long-Term Care', appendix1Code: 'F1', calcBuildingType: 'F1', hotwaterCategory: 'long_term_care', status: 'ready', table32Label: 'F-1 乙醫療照護(醫院、長照)' },
  { id: 'F2_SMALL_CARE_TRAINING', labelZh: 'F-2 小型照護訓練機構', labelEn: 'F-2 Small Care / Training Institution', appendix1Code: 'F2', calcBuildingType: 'F2', hotwaterCategory: null, status: 'ready', table32Label: 'F-2 小型照護訓練機構' },
  { id: 'F3_CHILD_YOUTH_INSTITUTION', labelZh: 'F-3 兒少機構', labelEn: 'F-3 Child / Youth Institution', appendix1Code: null, calcBuildingType: 'F3', hotwaterCategory: null, status: 'pending_crosswalk', table32Label: 'F-3 兒少機構' },
  { id: 'G1_FINANCE_SECURITIES', labelZh: 'G-1 金融證券', labelEn: 'G-1 Finance / Securities', appendix1Code: 'G1', calcBuildingType: 'G1', hotwaterCategory: null, status: 'ready', table32Label: 'G-1 金融證券' },
  { id: 'G2_OFFICE', labelZh: 'G-2 辦公場所', labelEn: 'G-2 Office', appendix1Code: 'G2', calcBuildingType: 'G2', hotwaterCategory: null, status: 'ready', table32Label: 'G-2 辦公場所' },
  { id: 'G3_OUTPATIENT_RETAIL_SERVICE', labelZh: 'G-3 門診零售服務', labelEn: 'G-3 Outpatient / Retail Service', appendix1Code: null, calcBuildingType: 'G3', hotwaterCategory: null, status: 'pending_crosswalk', table32Label: 'G-3 門診零售服務' },
  { id: 'H1_H2_NON_RESIDENTIAL', labelZh: 'H-1/H-2 非住宅用途', labelEn: 'H-1/H-2 Non-Residential Use', appendix1Code: 'H1', calcBuildingType: 'H1', hotwaterCategory: 'dormitory', status: 'ready', table32Label: 'H-1 及 H-2(住宅、集合住宅除外)' },
];

type EvidenceCall = {
  name: string;
  method: 'GET' | 'POST';
  path: string;
  requestBody: unknown;
  status: number;
  responseBody: unknown;
};

interface MaterialLayer {
  material: string;
  thicknessMm: number;
  lambdaWmK: number;
}

const form = reactive({
  branchType: 'general',
  efficiencyMode: 'manual',
  buildingType: 'G2_OFFICE',
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
  // ── Item 8: Custom wall construction (k-value + thickness) ──
  customWallRi: 0.11,   // Internal surface resistance (wall)
  customWallRo: 0.04,   // External surface resistance
  customWallLayers: [
    { material: 'RC混凝土 / RC Concrete', thicknessMm: 200, lambdaWmK: 1.63 },
  ] as MaterialLayer[],
  // ── Custom roof construction ──
  customRoofRi: 0.10,   // Internal surface resistance (roof, horizontal)
  customRoofRo: 0.04,
  customRoofLayers: [
    { material: '隔熱材 / Insulation', thicknessMm: 80, lambdaWmK: 0.04 },
    { material: 'RC混凝土板 / RC Slab', thicknessMm: 150, lambdaWmK: 1.63 },
  ] as MaterialLayer[],
});

const loading = ref(false);
const error = ref('');
const result = ref<any>(null);
const activePreset = ref<'case1' | 'case2' | 'case3' | 'case4'>('case1');
const selectedUseCategory = computed(() => (
  bersUseCategories.find((category) => category.id === form.buildingType) || bersUseCategories.find((category) => category.id === 'G2_OFFICE')
));
const effectiveFloorArea = computed(() => Math.max(0, Number(form.totalFloorArea || 0) - Number(form.excludedArea || 0)));
const efficiencyModeLabel = computed(() => (
  form.efficiencyMode === 'manual' ? t('手動效率輸入', 'Manual efficiency') : t('DB/JSON 後端計算', 'DB/JSON backend')
));
const selectedUseCategoryName = computed(() => {
  const category = selectedUseCategory.value;
  return category ? t(category.labelZh, category.labelEn) : '-';
});

/**
 * Compute U-value from material layers using ISO 6946:
 *   U = 1 / (Ri + Σ(d_i / λ_i) + Ro)
 */
function calcUFromLayers(layers: MaterialLayer[], ri: number, ro: number): number | null {
  if (!layers.length) return null;
  const sumR = layers.reduce((acc, l) => {
    if (!l.thicknessMm || !l.lambdaWmK) return acc;
    return acc + (l.thicknessMm / 1000) / l.lambdaWmK;
  }, 0);
  const total = ri + sumR + ro;
  return total > 0 ? 1 / total : null;
}

const customWallU = computed(() =>
  calcUFromLayers(form.customWallLayers, form.customWallRi ?? 0.11, form.customWallRo ?? 0.04),
);
const customRoofU = computed(() =>
  calcUFromLayers(form.customRoofLayers, form.customRoofRi ?? 0.10, form.customRoofRo ?? 0.04),
);

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
        building_type: selectedUseCategory.value?.calcBuildingType || 'G2',
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
  padding: 18px 20px 28px;
  background:
    linear-gradient(180deg, #f8fbff 0%, #f3f7fb 42%, #eef4f8 100%);
  color: #1e293b;
  font-family: var(--ui-font-sans);
}

.calc-card {
  width: min(1480px, 100%);
  margin: 0 auto;
  background: #fff;
  border: 1px solid #e3ebf7;
  border-radius: 10px;
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.08);
  overflow: hidden;
}

.calc-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  padding: 18px 22px;
  border-bottom: 1px solid #e9eef7;
  background: linear-gradient(180deg, #fff 0%, #fbfdff 100%);
}

.title-block h1 {
  margin: 0;
  color: #0f172a;
  font-size: 1.55rem;
  line-height: 1.15;
  font-weight: 900;
}

.title-block p {
  margin: 8px 0 0;
  color: #52647a;
  font-size: 0.86rem;
  line-height: 1.45;
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
  align-items: center;
  gap: 16px;
  padding: 14px 22px;
  border-bottom: 1px solid #eef2f8;
  background: #fbfdff;
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
  border-radius: 8px;
  padding: 8px 13px;
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

.calc-run-summary {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, auto));
  gap: 10px;
  align-items: stretch;
}

.calc-run-summary > div {
  min-width: 132px;
  padding: 9px 12px;
  border: 1px solid #e2eaf6;
  border-radius: 8px;
  background: #fff;
}

.calc-run-summary span {
  display: block;
  color: #718096;
  font-size: 0.66rem;
  font-weight: 800;
  text-transform: uppercase;
}

.calc-run-summary strong {
  display: block;
  margin-top: 3px;
  color: #0f172a;
  font-size: 0.8rem;
  line-height: 1.25;
  font-weight: 900;
}

.calc-body {
  display: grid;
  grid-template-columns: minmax(520px, 640px) minmax(420px, 1fr);
  gap: 20px;
  align-items: start;
  padding: 22px;
}

.calc-input,
.calc-output {
  min-width: 0;
  border: 1px solid #e2eaf6;
  border-radius: 10px;
  background: #fff;
  padding: 18px;
}

.calc-input {
  background: #fcfdff;
}

.calc-output {
  position: sticky;
  top: 18px;
}

.calc-panel-heading {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-bottom: 16px;
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
  color: #0f172a;
  font-size: 1.05rem;
  font-weight: 800;
}

.calc-panel-heading p {
  margin: 2px 0 0;
  font-size: var(--text-xs);
  color: #64748b;
}

.calc-form-grid {
  display: grid;
  gap: 16px;
}

.field-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
}

.field {
  display: grid;
  gap: 7px;
  align-content: start;
}

.field span {
  font-size: 0.74rem;
  font-weight: 800;
  color: #334155;
  line-height: 1.35;
}

.field input,
.field select {
  width: 100%;
  min-width: 0;
  height: 40px;
  border: 1px solid #ccd9ea;
  border-radius: 8px;
  background: #fff;
  padding: 0 12px;
  color: #0f172a;
  font-size: 0.9rem;
  box-shadow: 0 1px 0 rgba(15, 23, 42, 0.02);
}

.field input:focus,
.field select:focus {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.14);
  outline: none;
}

.field-help {
  color: #64748b;
  font-size: 0.72rem;
  line-height: 1.42;
}

.calc-subsection {
  border: 1px solid #e6edf8;
  border-radius: 10px;
  background: #fbfdff;
  padding: 14px;
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
  height: 44px;
  border: 0;
  border-radius: 8px;
  background: linear-gradient(135deg, #2563eb 0%, #0891b2 100%);
  color: #fff;
  font-size: 0.92rem;
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
  min-height: 260px;
  display: grid;
  place-items: center;
  border: 1px dashed #d8e3f2;
  border-radius: 10px;
  background:
    linear-gradient(135deg, rgba(59, 130, 246, 0.04), rgba(14, 165, 233, 0.04));
  color: #94a3b8;
  font-size: var(--text-sm);
  text-align: center;
  padding: 24px;
}

.calc-metric-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 10px;
  margin-bottom: 16px;
}

.calc-precision-note {
  font-size: var(--text-2xs);
  color: #64748b;
  margin: 0 0 16px 0;
  padding: 8px 12px;
  border-left: 3px solid #cde3ff;
  background: #f6faff;
  line-height: 1.5;
}

.calc-warning-banner {
  margin: 0 0 16px 0;
  padding: 12px 16px;
  background: #fffaeb;
  border: 1px solid #f5c66f;
  border-left: 4px solid #d97706;
  border-radius: 8px;
  color: #78350f;
  font-size: var(--text-xs);
  line-height: 1.55;
}

.calc-warning-banner strong {
  display: block;
  color: #92400e;
  font-weight: 700;
  margin-bottom: 4px;
}

.calc-warning-banner p {
  margin: 0 0 4px 0;
}

.calc-warning-banner__values {
  margin-top: 6px;
  font-family: var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace);
  color: #78350f;
}

.calc-warning-banner__values strong {
  display: inline;
  color: #b45309;
  font-weight: 700;
  margin: 0;
}

.calc-metric-card {
  border: 1px solid #dfe9f7;
  border-radius: 9px;
  background: #fff;
  padding: 12px;
  min-height: 76px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.calc-metric-card--accent {
  background: linear-gradient(180deg, #eef7ff 0%, #e8f3ff 100%);
  border-color: #cde3ff;
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
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 14px;
  margin-bottom: 14px;
}

.calc-output-card {
  border: 1px solid #e6edf8;
  border-radius: 10px;
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
    grid-template-columns: minmax(0, 1fr);
  }

  .calc-output {
    position: static;
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

  .calc-run-summary {
    width: 100%;
    grid-template-columns: repeat(3, minmax(0, 1fr));
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

  .calc-run-summary {
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

/* ── Step headers ── */
.calc-step-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 8px 0 0;
  font-weight: 700;
  font-size: 0.9rem;
  color: #1e293b;
  border: 1px solid #dbeafe;
  border-left: 4px solid #3b82f6;
  border-radius: 8px;
  background: linear-gradient(90deg, #eff6ff 0%, #f8fbff 100%);
  padding: 9px 11px;
}
.calc-step-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 66px;
  padding: 4px 9px;
  background: #3b82f6;
  color: #fff;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 0.03em;
}
.calc-subsection-label {
  font-size: 0.82rem;
  font-weight: 800;
  color: #334155;
  margin: 16px 0 8px;
  padding: 7px 9px;
  background: #f1f5f9;
  border-radius: 8px;
}

/* ── Input type badges ── */
.badge {
  display: inline-flex;
  align-items: center;
  padding: 2px 7px;
  border-radius: 999px;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  vertical-align: middle;
  margin-right: 4px;
}
.badge--lookup {
  background: #dbeafe;
  color: #1d4ed8;
  border: 1px solid #93c5fd;
}
.badge--manual {
  background: #fef3c7;
  color: #92400e;
  border: 1px solid #fcd34d;
}
.badge--calc {
  background: #dcfce7;
  color: #166534;
  border: 1px solid #86efac;
}

/* ── Legend ── */
.calc-legend {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 7px;
  font-size: 0.75rem;
  color: #64748b;
  padding: 10px 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  margin-bottom: 16px;
}

/* ── Custom layer rows (Fix 8: k-value + thickness) ── */
.field-layer-row {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  padding: 10px;
  margin-bottom: 8px;
}
.field-layer-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 8px 0 14px;
  flex-wrap: wrap;
}
.field--inline {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: nowrap;
}
.btn-remove-layer {
  background: #fee2e2;
  border: none;
  color: #dc2626;
  border-radius: 50%;
  width: 22px;
  height: 22px;
  font-size: 0.75rem;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.btn-remove-layer:hover { background: #fca5a5; }
.calc-btn-sm {
  padding: 4px 12px;
  font-size: 0.78rem;
  font-weight: 600;
  background: #eff6ff;
  color: #1d4ed8;
  border: 1px solid #93c5fd;
  border-radius: 6px;
  cursor: pointer;
}
.calc-btn-sm:hover { background: #dbeafe; }
</style>
