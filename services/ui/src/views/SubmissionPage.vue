<template>
  <main class="submission-page">
    <section class="submission-shell">
      <header class="submission-topbar">
        <div class="submission-title-block">
          <h1>{{ t('Phase 1 提送說明文件', 'Phase 1 Submission Memorandum') }}</h1>
          <p>
            {{ t(
              '供主管機關及委託顧問單位審查使用之正式摘要文件。',
              'Formal summary document for agency and consultant review.'
            ) }}
          </p>
        </div>

        <div class="submission-actions">
          <LanguageToggle />
          <div class="submission-toolbar">
            <button class="submission-link" @click="navigate('/dashboard')">
              {{ t('返回儀表板', 'Dashboard') }}
            </button>
            <button class="submission-link" @click="navigate('/calculation')">
              {{ t('計算頁面', 'Calculation') }}
            </button>
            <button class="submission-link" @click="navigate('/api-console')">
              {{ t('API 驗證頁', 'API Console') }}
            </button>
          </div>
        </div>
      </header>

      <div class="submission-content">
        <section class="submission-hero">
          <div>
            <p class="submission-kicker">{{ t('正式提送文件', 'Formal Submission Record') }}</p>
            <h2>
              {{ t(
                '桃園市建築物能源設計平台第一階段提送摘要',
                'Phase 1 Delivery Summary for the Taoyuan Building Energy Design Platform'
              ) }}
            </h2>
            <div class="submission-summary">
              <p>
                {{ t(
                  '本文件係就桃園市建築物能源設計平台第一階段成果辦理提送說明，供主管機關及委託顧問單位進行功能檢視、計算流程確認及結果審查。',
                  'This memorandum accompanies the Phase 1 delivery of the Taoyuan Building Energy Design Platform for agency and consultant review of functions, calculation flow, and calculation results.'
                ) }}
              </p>
            </div>
          </div>
        </section>

        <section class="submission-grid">
          <article class="submission-card">
            <div class="card-heading">
              <span class="card-heading__index">01</span>
              <div>
                <h3>{{ t('基本資料', 'Basic Information') }}</h3>
                <p>{{ t('提送文件之基本識別資訊', 'Core identification information for this submission') }}</p>
              </div>
            </div>
            <div class="detail-list">
              <div class="detail-row">
                <span>{{ t('專案名稱', 'Project Name') }}</span>
                <strong>{{ t('桃園市建築物能源設計平台', 'Taoyuan Building Energy Design Platform') }}</strong>
              </div>
              <div class="detail-row">
                <span>{{ t('提送階段', 'Submission Phase') }}</span>
                <strong>Phase 1 Calculation Engine</strong>
              </div>
              <div class="detail-row">
                <span>{{ t('版本', 'Version') }}</span>
                <strong>v1.0</strong>
              </div>
            </div>
          </article>

          <article class="submission-card">
            <div class="card-heading">
              <span class="card-heading__index">02</span>
              <div>
                <h3>{{ t('提送目的', 'Purpose of Submission') }}</h3>
                <p>{{ t('本次提送用途說明', 'Statement of the purpose of this delivery') }}</p>
              </div>
            </div>
            <div class="section-copy">
              <p>
                {{ t(
                  '本次提送內容為桃園市建築物能源設計平台第一階段成果，重點包括建築能效計算引擎、公式驗證流程、測試紀錄及測試環境，供主管機關及委託顧問單位進行審查。',
                  'This delivery covers the Phase 1 result of the Taoyuan Building Energy Design Platform, including the building energy calculation engine, formula verification flow, test record, and review environment for agency and consultant examination.'
                ) }}
              </p>
            </div>
          </article>

          <article class="submission-card submission-card--wide">
            <div class="card-heading">
              <span class="card-heading__index">03</span>
              <div>
                <h3>{{ t('本次提送範圍', 'Scope of Delivery') }}</h3>
                <p>{{ t('第一階段完成項目', 'Items completed in Phase 1') }}</p>
              </div>
            </div>
            <ul class="submission-list">
              <li>{{ t('使用者登入功能', 'User login function') }}</li>
              <li>{{ t('Dashboard 主頁面', 'Dashboard main page') }}</li>
              <li>{{ t('Calculation Dashboard 計算介面', 'Calculation Dashboard interface') }}</li>
              <li>{{ t('Individual Equation / API Console 驗證介面', 'Individual Equation / API Console validation interface') }}</li>
              <li>{{ t('一般建築分支（General / No Central Hot Water）計算流程', 'General branch calculation flow') }}</li>
              <li>{{ t('中央熱水分支（Central Hot Water）計算流程', 'Central hot-water branch calculation flow') }}</li>
              <li>{{ t('DB-driven efficiency source 驗證流程', 'DB-driven efficiency source validation flow') }}</li>
              <li>{{ t('Renewable Bonus 計算流程', 'Renewable Bonus calculation flow') }}</li>
              <li>{{ t('NZB 驗證流程', 'NZB validation flow') }}</li>
              <li>{{ t('Phase 1 測試結果紀錄', 'Phase 1 test execution record') }}</li>
            </ul>
          </article>

          <article class="submission-card submission-card--wide">
            <div class="card-heading">
              <span class="card-heading__index">04</span>
              <div>
                <h3>{{ t('測試案例連結', 'Test Case Record Link') }}</h3>
                <p>{{ t('供審查使用之測試案例文件', 'Test-case document provided for review') }}</p>
              </div>
            </div>
            <div class="access-panel">
              <span>{{ t('測試案例文件', 'Test Case Sheet') }}</span>
              <a
                class="access-panel__button"
                href="https://docs.google.com/spreadsheets/d/1vEE_XsfRl_TbSmfay3Sw-OI-tCbEjzg-tuu4UaAzYmY/edit?usp=sharing"
                target="_blank"
                rel="noopener"
              >
                {{ t('開啟測試案例文件', 'Open Test Case Sheet') }}
              </a>
            </div>
          </article>

          <article class="submission-card submission-card--wide">
            <div class="card-heading">
              <span class="card-heading__index">05</span>
              <div>
                <h3>{{ t('測試執行情形', 'Test Execution Summary') }}</h3>
                <p>{{ t('目前完成之驗證範圍', 'Validation coverage completed to date') }}</p>
              </div>
            </div>
            <div class="test-summary">
              <ul class="submission-list">
                <li>{{ t('Login 功能測試', 'Login function verification') }}</li>
                <li>{{ t('Dashboard Navigation 測試', 'Dashboard navigation verification') }}</li>
                <li>{{ t('Eq. 3.1 ~ Eq. 3.24 主要公式驗證', 'Verification of major formulas from Eq. 3.1 to Eq. 3.24') }}</li>
                <li>{{ t('Eq. 3.16a / Eq. 3.16b 分數換算驗證', 'Score conversion verification for Eq. 3.16a and Eq. 3.16b') }}</li>
                <li>{{ t('Grade Mapping 驗證', 'Grade mapping verification') }}</li>
                <li>{{ t('Central Hot Water 分支驗證', 'Central hot-water branch verification') }}</li>
                <li>{{ t('DB-driven efficiency source 驗證', 'DB-driven efficiency source verification') }}</li>
                <li>{{ t('Renewable Bonus 驗證', 'Renewable Bonus verification') }}</li>
                <li>{{ t('NZB 驗證', 'NZB verification') }}</li>
              </ul>

              <div class="status-panel">
                <div class="status-chip">{{ t('第一階段可供審查', 'Phase 1 Review Ready') }}</div>
                <p>
                  {{ t(
                    '第一階段主要功能與公式驗證流程已完成，可供主管機關及委託顧問單位進行審查。',
                    'The major Phase 1 functions and formula verification flow have been completed and are ready for formal review.'
                  ) }}
                </p>
              </div>
            </div>
          </article>

          <article class="submission-card">
            <div class="card-heading">
              <span class="card-heading__index">06</span>
              <div>
                <h3>{{ t('補充說明', 'Additional Notes') }}</h3>
                <p>{{ t('本次提送之補充事項', 'Supplemental notes for this submission') }}</p>
              </div>
            </div>
            <ul class="submission-list">
              <li>{{ t('本次提送以 Phase 1 Calculation Engine 驗證為主。', 'This submission focuses on Phase 1 Calculation Engine validation.') }}</li>
              <li>{{ t('目前介面內容已可支援審查與測試使用。', 'The current interface is sufficient for review and testing.') }}</li>
              <li>{{ t('系統中 beta1 已採後端管理值進行控制。', 'The beta1 value is centrally managed by the backend.') }}</li>
            </ul>
          </article>

          <article class="submission-card">
            <div class="card-heading">
              <span class="card-heading__index">07</span>
              <div>
                <h3>{{ t('請協助事項', 'Requested Review Items') }}</h3>
                <p>{{ t('本次審查重點', 'Requested focus of review') }}</p>
              </div>
            </div>
            <ul class="submission-list">
              <li>{{ t('計算公式與結果確認', 'Confirmation of formulas and calculation results') }}</li>
              <li>{{ t('測試流程檢視', 'Review of the testing process') }}</li>
              <li>{{ t('回饋需修正事項或建議事項', 'Feedback on required fixes or recommendations') }}</li>
            </ul>
          </article>

          <article class="submission-card submission-card--wide">
            <div class="card-heading">
              <span class="card-heading__index">08</span>
              <div>
                <h3>{{ t('隨附資料', 'Accompanying Materials') }}</h3>
                <p>{{ t('隨文提供之審查資料', 'Materials provided with this submission') }}</p>
              </div>
            </div>
            <ul class="submission-list">
              <li>{{ t('測試結果紀錄表', 'Test execution record sheet') }}</li>
              <li>{{ t('計算證據輸出與必要 JSON 結果', 'Calculation evidence output and required JSON results') }}</li>
            </ul>
            <div class="document-downloads">
              <a
                class="document-downloads__button"
                :href="submissionZhPdf"
                download="Phase1_Submission_ZH.pdf"
              >
                {{ t('下載中文 PDF', 'Download Chinese PDF') }}
              </a>
              <a
                class="document-downloads__button"
                :href="submissionEnPdf"
                download="Phase1_Submission_EN.pdf"
              >
                {{ t('下載英文 PDF', 'Download English PDF') }}
              </a>
            </div>
          </article>
        </section>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import submissionEnPdf from '../assets/Submission - Taoyuan Building Energy Design Platform.pdf';
import submissionZhPdf from '../assets/Submission - 桃園市建築物能源設計平台 .pdf';
import LanguageToggle from '../components/LanguageToggle.vue';
import { useI18n } from '../i18n';
import { navigate } from '../nav';

const { t } = useI18n();
</script>

<style scoped>
.submission-page {
  min-height: 100vh;
  background: linear-gradient(180deg, #f7f9fc 0%, #f4f7fb 100%);
  color: #0f172a;
}

.submission-shell {
  width: min(1200px, calc(100vw - 32px));
  margin: 0 auto;
  padding: 18px 0 40px;
}

.submission-topbar {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 24px;
  background: #fff;
  border: 1px solid #e3eaf4;
  border-radius: 24px;
  padding: 24px 28px;
  box-shadow: 0 18px 34px rgba(15, 23, 42, 0.05);
}

.submission-title-block h1 {
  margin: 0;
  font-size: 2rem;
  font-weight: 900;
  letter-spacing: -0.04em;
}

.submission-title-block p {
  margin: 8px 0 0;
  font-size: 0.96rem;
  color: #475569;
  line-height: 1.65;
}

.submission-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.submission-toolbar {
  display: inline-flex;
  align-items: center;
  gap: 0;
  border: 1px solid #d8e5f7;
  border-radius: 999px;
  background: #fff;
  overflow: hidden;
  flex: 0 0 auto;
}

.submission-link {
  border: 0;
  background: transparent;
  color: #3563f7;
  font-size: 0.92rem;
  font-weight: 700;
  padding: 12px 18px;
  cursor: pointer;
}

.submission-link + .submission-link {
  border-left: 1px solid #e6edf7;
}

.submission-content {
  padding-top: 24px;
}

.submission-hero {
  margin-bottom: 24px;
}

.submission-kicker {
  margin: 0 0 12px;
  font-size: 0.8rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: #2563eb;
}

.submission-hero h2 {
  margin: 0;
  font-size: 1.6rem;
  font-weight: 900;
  letter-spacing: -0.03em;
  line-height: 1.35;
}

.submission-summary {
  margin-top: 16px;
  color: #334155;
}

.submission-summary p {
  margin: 0;
  font-size: 0.96rem;
  line-height: 1.75;
}

.submission-card {
  background: #fff;
  border: 1px solid #e4ebf5;
  border-radius: 24px;
  box-shadow: 0 16px 30px rgba(15, 23, 42, 0.05);
}

.submission-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 22px;
}

.submission-card {
  padding: 22px 24px;
}

.submission-card--wide {
  grid-column: 1 / -1;
}

.card-heading {
  display: flex;
  align-items: flex-start;
  gap: 14px;
  margin-bottom: 18px;
}

.card-heading__index {
  width: 38px;
  height: 38px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  background: #eef4ff;
  color: #3563f7;
  font-size: 0.84rem;
  font-weight: 800;
  flex: 0 0 auto;
}

.card-heading h3 {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 800;
}

.card-heading p {
  margin: 6px 0 0;
  font-size: 0.86rem;
  color: #64748b;
  line-height: 1.6;
}

.section-copy p {
  margin: 0;
  font-size: 0.95rem;
  line-height: 1.75;
  color: #334155;
}

.detail-list {
  display: grid;
  gap: 12px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 0;
  border-bottom: 1px solid #eef2f7;
}

.detail-row:last-child {
  border-bottom: 0;
}

.detail-row span {
  color: #64748b;
  font-size: 0.9rem;
}

.detail-row strong {
  text-align: right;
  font-size: 0.92rem;
}

.access-panel {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
  padding: 16px 18px;
  border: 1px solid #e6edf7;
  border-radius: 18px;
  background: linear-gradient(180deg, #fcfdff 0%, #f6f9ff 100%);
}

.access-panel span {
  color: #64748b;
  font-size: 0.92rem;
  font-weight: 700;
}

.access-panel a {
  color: #2563eb;
  font-weight: 800;
  text-decoration: none;
  word-break: break-all;
  text-align: right;
}

.access-panel__button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 42px;
  padding: 0 18px;
  border: 1px solid #cfe0fb;
  border-radius: 999px;
  background: #ffffff;
  box-shadow: 0 10px 22px rgba(37, 99, 235, 0.08);
  color: #2563eb;
  font-weight: 800;
  text-decoration: none;
  white-space: nowrap;
}

.submission-list {
  margin: 0;
  padding-left: 20px;
  display: grid;
  gap: 10px;
  color: #1f2937;
  font-size: 0.93rem;
  line-height: 1.68;
}

.document-downloads {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 18px;
}

.document-downloads__button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  padding: 0 18px;
  border: 1px solid #cfe0fb;
  border-radius: 999px;
  background: #ffffff;
  box-shadow: 0 10px 22px rgba(37, 99, 235, 0.08);
  color: #2563eb;
  font-size: 0.9rem;
  font-weight: 800;
  text-decoration: none;
  white-space: nowrap;
}

.test-summary {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 300px;
  gap: 24px;
  align-items: start;
}

.status-panel {
  border: 1px solid #dfe9f5;
  border-radius: 18px;
  background: linear-gradient(180deg, #f9fbff 0%, #f3f8ff 100%);
  padding: 18px;
}

.status-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 34px;
  border-radius: 999px;
  padding: 0 14px;
  background: #dcfce7;
  color: #15803d;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.status-panel p {
  margin: 14px 0 0;
  color: #334155;
  font-size: 0.9rem;
  line-height: 1.7;
}

@media (max-width: 980px) {
  .submission-shell {
    width: min(100vw - 24px, 1200px);
  }

  .submission-topbar,
  .test-summary {
    grid-template-columns: 1fr;
  }

  .submission-topbar {
    display: grid;
  }

  .submission-actions {
    justify-content: flex-start;
  }
}

@media (max-width: 720px) {
  .submission-shell {
    width: min(100vw - 20px, 1200px);
    padding-top: 12px;
  }

  .submission-topbar {
    padding: 18px;
    border-radius: 20px;
  }

  .submission-title-block h1 {
    font-size: 1.55rem;
  }

  .submission-toolbar {
    width: 100%;
    flex-wrap: wrap;
    border-radius: 18px;
  }

  .submission-link {
    flex: 1 1 50%;
    padding: 12px 14px;
  }

  .document-downloads__button {
    flex: 1 1 calc(50% - 6px);
  }

  .submission-grid {
    grid-template-columns: 1fr;
  }

  .submission-card {
    border-radius: 20px;
  }

  .submission-card {
    padding: 18px;
  }

  .detail-row,
  .access-panel {
    flex-direction: column;
    align-items: flex-start;
  }

  .detail-row strong,
  .access-panel a {
    text-align: left;
  }

  .access-panel__button {
    width: 100%;
  }
}

@media (max-width: 520px) {
  .submission-title-block h1 {
    font-size: 1.32rem;
  }

  .submission-title-block p,
  .submission-summary p {
    font-size: 0.9rem;
  }

  .submission-hero h2 {
    font-size: 1.28rem;
  }

  .submission-link {
    flex: 1 1 100%;
  }

  .document-downloads__button {
    width: 100%;
    flex-basis: 100%;
  }
}
</style>
