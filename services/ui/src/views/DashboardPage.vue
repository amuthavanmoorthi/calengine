<template>
  <main class="dashboard-shell">
    <aside class="sidebar">
      <div class="brand-block">
        <div class="brand-logo">
          <img :src="siteLogo" alt="BERSn logo" />
        </div>
        <div>
          <p class="brand-name">EngineOps</p>
          <p class="brand-subtitle">{{ t('BERSn 計算平台', 'BERSn calculation platform') }}</p>
        </div>
      </div>

      <nav class="side-nav">
        <button class="nav-link active" type="button">
          <span class="nav-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M4 4h6v6H4zm10 0h6v6h-6zM4 14h6v6H4zm10 0h6v6h-6z" />
            </svg>
          </span>
          <span>{{ t('總覽首頁', 'Dashboard') }}</span>
        </button>
        <button class="nav-link" type="button" @click="navigate('/calculation')">
          <span class="nav-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M3 13c2.5 0 2.5-4 5-4s2.5 4 5 4 2.5-4 5-4 2.5 4 3.5 4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
            </svg>
          </span>
          <span>{{ t('計算頁面', 'Calculation') }}</span>
        </button>
        <button class="nav-link" type="button" @click="navigate('/submission')">
          <span class="nav-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M5 5h14v14H5zM9 5v14M15 5v14" fill="none" stroke="currentColor" stroke-width="2" />
            </svg>
          </span>
          <span>{{ t('提交文件', 'Submission') }}</span>
        </button>
        <button class="nav-link" type="button" @click="navigate('/api-console')">
          <span class="nav-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24">
              <path d="M6 4h9l3 3v13H6z" fill="none" stroke="currentColor" stroke-width="2" />
              <path d="M15 4v4h4M8 12h8M8 16h8" fill="none" stroke="currentColor" stroke-width="2" />
            </svg>
          </span>
          <span>{{ t('API 驗證', 'API Console') }}</span>
        </button>
      </nav>

      <div class="sidebar-footer">
        <button class="logout-link" type="button" @click="onLogout">
          <span>↪</span>
          <span>{{ t('系統登出', 'System Logout') }}</span>
        </button>
      </div>
    </aside>

    <section class="content-shell">
      <header class="topbar">
        <div class="title-block">
          <h1>桃園市建築物能源設計平台</h1>
          <p>{{ t('BERSn Phase 1 計算與審查儀表板', 'BERSn Phase 1 Calculation and Review Dashboard') }} <span class="version-chip">v1.0</span></p>
        </div>
        <div class="topbar-actions">
          <LanguageToggle />
          <div class="user-card user-card--header">
            <div class="avatar avatar--photo" aria-hidden="true">U</div>
            <div>
              <p class="user-name user-name--header">{{ t('機關帳號', 'Agency') }}</p>
              <p class="user-role">{{ t('測試人員', 'Tester') }}</p>
            </div>
          </div>
          <!-- <button class="secure-chip" type="button" @click="refreshStatus">
            <span class="secure-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24">
                <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" fill="none" stroke="currentColor" stroke-width="2" />
                <path d="M9.5 12l1.7 1.7L14.8 10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
              </svg>
            </span>
            <span>Auth Secure</span>
          </button> -->
        </div>
      </header>

      <section class="content-body">
        <article class="overview-block">
          <h2>{{ t('系統總覽', 'System Overview') }}</h2>
          <p>
            {{ t(
              'BERSn Phase 1 提供建築能效計算與審查環境，支援一般非住宅、中央熱水、再生能源加成與 NZB 檢核等核心流程，並可追蹤公式與驗證結果。',
              'BERSn Phase 1 provides a calculation and review environment for building energy performance assessment. The platform supports core EEI calculation workflows, formula traceability, and result verification for general non-residential, hot-water, renewable bonus, and NZB-related checks.'
            ) }}
          </p>
        </article>

        <section class="panel-grid">
          <article class="module-panel">
            <div class="panel-heading">
              <span class="panel-heading-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" />
                </svg>
              </span>
              <div>
                <h3>{{ t('系統模組', 'Module') }}</h3>
                <p>{{ t('目前啟用之核心計算與驗證模組。', 'Essential backend components for system operations.') }}</p>
              </div>
            </div>

            <div class="module-list">
              <div class="module-item">
                <span class="dot" />
                <span>{{ t('登入與驗證 API Gateway', 'Auth + Login API Gateway') }}</span>
              </div>
              <div class="module-item">
                <span class="dot" />
                <span>{{ t('一般建築 EEI 計算分支', 'General EEI Calculation Branch') }}</span>
              </div>
              <div class="module-item">
                <span class="dot" />
                <span>{{ t('中央熱水計算分支', 'Hot-water System Branch') }}</span>
              </div>
              <div class="module-item">
                <span class="dot" />
                <span>{{ t('再生能源加成模組', 'Renewable Energy Bonus Processor') }}</span>
              </div>
              <div class="module-item">
                <span class="dot" />
                <span>{{ t('NZB 檢核模組', 'NZB Verification Checks') }}</span>
              </div>
              <div class="module-item">
                <span class="dot" />
                <span>{{ t('公式追蹤與資料保存', 'Trace Log + Data Persistence') }}</span>
              </div>
              <div class="module-item">
                <span class="dot" />
                <span>{{ t('區位與資料對應服務', 'Geo-Mapping Service') }}</span>
              </div>
              <div class="module-item">
                <span class="dot" />
                <span>{{ t('報表輸出引擎（PDF/JSON）', 'Reporting Engine (PDF/JSON)') }}</span>
              </div>
            </div>
          </article>

          <article class="action-panel">
            <div class="panel-heading action-heading">
              <span class="action-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path d="M8 6l10 6-10 6z" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round" />
                </svg>
              </span>
              <div>
                <h3>{{ t('快速操作', 'Quick Actions') }}</h3>
               <p>{{ t('快速進入計算、單公式驗證與提交文件。', 'Start calculations, run equations, and access key documents.') }}</p>
              </div>
            </div>

            <div class="action-list">
              <button class="primary-action" type="button" @click="navigate('/calculation')">
                <span>{{ t('開始計算', 'Start Calculation') }}</span>
                <span class="action-arrow" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                </span>
              </button>
              <button class="secondary-action" type="button" @click="navigate('/api-console')">
                <span>{{ t('執行單一公式', 'Run Individual Equation') }}</span>
                <span class="action-arrow" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                </span>
              </button>
              <button class="secondary-action" type="button" @click="navigate('/submission')">
                <span>{{ t('提交文件', 'Documents') }}</span>
                <span class="action-arrow" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
                  </svg>
                </span>
              </button>
            </div>
          </article>
        </section>
      </section>

      <footer class="page-footer">
        <p>© 2026 {{ t('EngineOps Core Systems. 版權所有。', 'EngineOps Core Systems. All rights reserved.') }}</p>
      </footer>
    </section>
  </main>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { logout } from '../auth';
import LanguageToggle from '../components/LanguageToggle.vue';
import { useI18n } from '../i18n';
import { navigate } from '../nav';
import siteLogo from '../assets/Logo.jpeg';

// Frontend -> API URL by environment:
// - Development UI (local Vite frontend): use `http://localhost:8080`
// - Testing UI (Zeabur frontend): `.env.production` sets `VITE_API_URL=https://calengine-api.zeabur.app`
// - Production UI: set `VITE_API_URL` to the future production API URL
const API_BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) || 'http://localhost:8080';
const { t } = useI18n();
const apiHealth = ref('Checking...');
const systemReady = ref('Checking...');

async function refreshStatus() {
  try {
    const healthResp = await fetch(`${API_BASE_URL}/health`);
    const healthJson = await healthResp.json().catch(() => ({}));
    apiHealth.value = healthResp.ok ? String(healthJson.status || 'ok') : `fail (${healthResp.status})`;
  } catch (_) {
    apiHealth.value = 'down';
  }

  try {
    const readyResp = await fetch(`${API_BASE_URL}/ready`);
    const readyJson = await readyResp.json().catch(() => ({}));
    systemReady.value = readyResp.ok ? String(readyJson.status || 'ready') : `fail (${readyResp.status})`;
  } catch (_) {
    systemReady.value = 'down';
  }
}

function onLogout() {
  logout();
  navigate('/login');
}

onMounted(refreshStatus);
</script>

<style scoped>
.dashboard-shell svg {
  display: block;
  max-width: 100%;
  max-height: 100%;
}

.dashboard-shell {
  min-height: 100vh;
  display: grid;
  grid-template-columns: 260px minmax(0, 1fr);
  background: #f5f7fb;
  color: #1e293b;
}

.sidebar {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  background: linear-gradient(180deg, #f7f9fc 0%, #f4f6fb 100%);
  border-right: 1px solid #e5ebf4;
  min-height: 100vh;
  overflow: hidden;
}

.brand-block {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 24px 22px 18px;
}

.brand-logo {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  overflow: hidden;
  display: grid;
  place-items: center;
  background: #ffffff;
  box-shadow: 0 10px 22px rgba(15, 23, 42, 0.08);
  flex: 0 0 auto;
}

.brand-logo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.brand-name {
  margin: 0;
  font-size: 0.98rem;
  font-weight: 800;
  color: #0f6bdc;
  line-height: 1.1;
}

.brand-subtitle {
  margin: 2px 0 0;
  font-size: 0.72rem;
  color: #64748b;
  line-height: 1.35;
}

.side-nav {
  display: grid;
  gap: 8px;
  padding: 0 18px;
  margin-top: 10px;
}

.nav-link {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  border: 0;
  background: transparent;
  color: #1e293b;
  font-size: 0.9rem;
  font-weight: 600;
  border-radius: 14px;
  padding: 14px 16px;
  text-align: left;
  cursor: pointer;
  transition: background-color 140ms ease, color 140ms ease;
}

.nav-link.active {
  background: #dbeafe;
  color: #0f6bdc;
}

.nav-link:hover:not(.active) {
  background: rgba(219, 234, 254, 0.48);
}

.nav-icon {
  width: 18px;
  height: 18px;
  display: inline-flex;
  justify-content: center;
  align-items: center;
  color: #5b6b85;
  flex: 0 0 auto;
}

.nav-icon svg {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.9;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.sidebar-footer {
  padding: 22px 18px 22px;
  border-top: 1px solid #e5ebf4;
  margin-top: auto;
}

.user-card {
  display: flex;
  align-items: center;
  gap: 12px;
  background: #fff;
  border: 1px solid #e7edf7;
  border-radius: 14px;
  padding: 12px 14px;
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.04);
}

.user-card--header {
  min-width: auto;
  padding: 0;
  gap: 10px;
  border: 0;
  border-radius: 0;
  background: transparent;
  box-shadow: none;
}

.avatar {
  width: 36px;
  height: 36px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  background: linear-gradient(135deg, #eef4ff 0%, #b9d5ff 100%);
  color: #2563eb;
  font-weight: 800;
}

.avatar--photo {
  width: 42px;
  height: 42px;
  color: transparent;
  box-shadow: 0 0 0 3px #d9fbef;
  background:
    radial-gradient(circle at 50% 38%, #f3c29a 0 18%, transparent 18.5%),
    radial-gradient(circle at 50% 68%, #1e4f72 0 23%, transparent 23.5%),
    radial-gradient(circle at 50% 26%, #5b3c2e 0 14%, transparent 14.5%),
    linear-gradient(135deg, #65e8c3 0%, #35c995 100%);
}

.user-name {
  margin: 0;
  font-size: 0.92rem;
  font-weight: 700;
}

.user-name--header {
  font-size: 1rem;
  font-weight: 800;
  color: #1f2937;
  line-height: 1;
}

.user-role {
  margin: 2px 0 0;
  font-size: 0.68rem;
  color: #94a3b8;
  letter-spacing: 0.04em;
}

.user-card--header .user-role {
  display: block;
  margin-top: 6px;
  font-size: 0.72rem;
  color: #8ea0b8;
  letter-spacing: 0.03em;
  line-height: 1.2;
}

.logout-link {
  margin-top: 0;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  border: 0;
  background: transparent;
  color: #ef4444;
  font-size: 0.94rem;
  font-weight: 700;
  cursor: pointer;
}

.content-shell {
  display: grid;
  grid-template-rows: auto 1fr auto;
  min-width: 0;
}

.topbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 24px;
  padding: 24px 34px 20px;
  background: #fff;
  border-bottom: 1px solid #e5ebf4;
}

.title-block h1 {
  margin: 0;
  font-size: 1.65rem;
  font-weight: 900;
  letter-spacing: -0.03em;
}

.title-block p {
  margin: 6px 0 0;
  font-size: 0.92rem;
  color: #475569;
}

.topbar-actions {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-left: auto;
}

.version-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  height: 28px;
  border-radius: 999px;
  background: #f3f5f9;
  color: #334155;
  font-size: 0.78rem;
  font-weight: 700;
}

.secure-chip {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  border: 1px solid #e5ebf4;
  background: #fff;
  color: #111827;
  padding: 10px 16px;
  border-radius: 999px;
  font-size: 0.88rem;
  font-weight: 700;
  cursor: pointer;
}

.secure-icon {
  width: 16px;
  height: 16px;
  display: inline-flex;
}

.secure-icon svg {
  width: 16px;
  height: 16px;
  stroke: currentColor;
}

.content-body {
  padding: 32px 34px 28px;
}

.overview-block {
  max-width: 920px;
  margin-bottom: 30px;
}

.overview-block h2 {
  margin: 0 0 14px;
  font-size: 1.22rem;
  font-weight: 900;
  letter-spacing: -0.03em;
}

.overview-block p {
  margin: 0;
  max-width: 940px;
  color: #1f2937;
  font-size: 0.88rem;
  line-height: 1.65;
}

.panel-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(330px, 0.86fr);
  gap: 28px;
  align-items: start;
  max-width: 1120px;
}

.module-panel,
.action-panel {
  background: #fff;
  border: 1px solid #e6edf7;
  border-radius: 24px;
  box-shadow: 0 14px 28px rgba(15, 23, 42, 0.05);
}

.module-panel {
  padding: 22px 24px 18px;
}

.action-panel {
  padding: 22px 24px;
}

.panel-heading {
  display: flex;
  gap: 14px;
  align-items: flex-start;
  margin-bottom: 18px;
}

.panel-heading-icon,
.action-icon {
  width: 36px;
  height: 36px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  background: #eef4ff;
  color: #3563f7;
  flex: 0 0 auto;
}

.panel-heading-icon svg,
.action-icon svg {
  width: 16px;
  height: 16px;
  stroke: currentColor;
}

.panel-heading h3 {
  margin: 0;
  font-size: 0.98rem;
  font-weight: 800;
}

.panel-heading p {
  margin: 8px 0 0;
  color: #64748b;
  font-size: 0.84rem;
  line-height: 1.6;
}

.action-heading {
  margin-bottom: 24px;
}

.module-list {
  border-top: 1px solid #eef2f7;
}

.module-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 14px 6px;
  border-bottom: 1px solid #eef2f7;
  font-size: 0.92rem;
  font-weight: 600;
}

.dot {
  width: 9px;
  height: 9px;
  border-radius: 999px;
  background: #35c6b4;
  box-shadow: 0 0 0 4px rgba(53, 198, 180, 0.12);
  flex: 0 0 auto;
}

.action-list {
  display: grid;
  gap: 14px;
}

.primary-action,
.secondary-action {
  width: 100%;
  border-radius: 22px;
  border: 1px solid #d8e6ff;
  background: #fff;
  box-shadow: 0 16px 30px rgba(59, 130, 246, 0.12);
  padding: 16px 18px;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  color: #3393f4;
  font-size: 0.94rem;
  font-weight: 800;
  cursor: pointer;
}

.secondary-action {
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.06);
}

.action-arrow {
  width: 16px;
  height: 16px;
  display: inline-flex;
  flex: 0 0 auto;
}

.action-arrow svg {
  width: 16px;
  height: 16px;
  stroke: currentColor;
}

.page-footer {
  border-top: 1px solid #e5ebf4;
  background: #fff;
  padding: 18px 34px;
  color: #475569;
  font-size: 0.88rem;
  display: flex;
  justify-content: flex-end
}

@media (max-width: 1280px) {
  .panel-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 980px) {
  .dashboard-shell {
    grid-template-columns: 1fr;
  }

  .sidebar {
    border-right: 0;
    border-bottom: 1px solid #e5ebf4;
    min-height: auto;
  }

  .brand-block {
    padding: 18px 18px 14px;
  }

  .side-nav {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    padding: 0 18px 14px;
    margin-top: 0;
    overflow: visible;
  }

  .nav-link {
    justify-content: center;
    min-width: 0;
    white-space: normal;
    padding: 12px 14px;
  }

  .content-body,
  .topbar,
  .page-footer {
    padding-left: 24px;
    padding-right: 24px;
  }

  .topbar {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: start;
  }

  .topbar-actions {
    width: auto;
    margin-left: 0;
    justify-content: flex-end;
    padding-top: 4px;
  }

  .user-card--header {
    width: auto;
    max-width: none;
  }
}

@media (max-width: 680px) {
  .brand-block {
    gap: 10px;
    padding: 16px 16px 12px;
  }

  .brand-logo {
    width: 42px;
    height: 42px;
    border-radius: 12px;
  }

  .brand-logo img {
    width: 100%;
    height: 100%;
  }

  .side-nav {
    grid-template-columns: 1fr 1fr;
    padding: 0 16px 12px;
    gap: 10px;
  }

  .sidebar-footer {
    padding: 16px;
  }

  .topbar,
  .content-body,
  .page-footer {
    padding-left: 16px;
    padding-right: 16px;
  }

  .topbar {
    gap: 16px;
    padding-top: 18px;
    padding-bottom: 16px;
    grid-template-columns: 1fr;
  }

  .content-body {
    padding-top: 24px;
    padding-bottom: 22px;
  }

  .overview-block {
    margin-bottom: 22px;
  }

  .title-block h1 {
    font-size: 1.45rem;
  }

  .title-block p {
    font-size: 0.88rem;
    line-height: 1.5;
  }

  .topbar-actions {
    width: 100%;
    justify-content: flex-start;
    padding-top: 0;
  }

  .user-card--header {
    gap: 12px;
  }

  .module-panel,
  .action-panel {
    border-radius: 18px;
  }

  .module-panel,
  .action-panel {
    padding: 18px 18px 16px;
  }

  .action-list {
    gap: 12px;
  }

  .primary-action,
  .secondary-action {
    padding: 14px 16px;
    border-radius: 18px;
  }

  .page-footer {
    justify-content: flex-start;
  }
}

@media (max-width: 520px) {
  .dashboard-shell {
    background: #ffffff;
  }

  .brand-block {
    align-items: flex-start;
  }

  .side-nav {
    grid-template-columns: 1fr;
  }

  .nav-link {
    justify-content: flex-start;
  }

  .title-block h1 {
    font-size: 1.28rem;
    line-height: 1.2;
  }

  .title-block p {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px;
  }

  .topbar-actions {
    width: 100%;
  }

  .user-card--header {
    width: auto;
    max-width: none;
    min-width: 0;
  }

  .module-item {
    gap: 10px;
    padding: 12px 4px;
  }

  .overview-block p,
  .panel-heading p {
    line-height: 1.55;
  }

  .page-footer {
    font-size: 0.82rem;
  }
}
</style>
