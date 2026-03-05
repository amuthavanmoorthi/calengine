<template>
  <main class="page-shell wide">
    <section class="card dashboard-card">
      <header class="dashboard-header">
        <div>
          <p class="eyebrow">BERSn Calculation System - Phase 1</p>
          <h1>Engine Operations Dashboard</h1>
          <p class="version">v1.0-Phase1</p>
        </div>
        <div class="action-group">
          <button class="btn-secondary" @click="refreshStatus">Refresh Status</button>
          <button class="btn-secondary" @click="onLogout">Logout</button>
        </div>
      </header>

      <section class="kpi-grid">
        <article class="kpi-card">
          <p class="kpi-title">API Health</p>
          <strong class="kpi-value" :class="statusClass(apiHealth)">{{ apiHealth }}</strong>
        </article>
        <article class="kpi-card">
          <p class="kpi-title">System Readiness</p>
          <strong class="kpi-value" :class="statusClass(systemReady)">{{ systemReady }}</strong>
        </article>
        <article class="kpi-card">
          <p class="kpi-title">Backend Endpoints</p>
          <strong class="kpi-value">26</strong>
        </article>
        <article class="kpi-card">
          <p class="kpi-title">Engine Branches</p>
          <strong class="kpi-value">General + Hotwater + Renewable + NZB</strong>
        </article>
      </section>

      <section class="dashboard-grid">
        <article class="panel dark-panel">
          <h2>Calculation Pipeline</h2>
          <div class="pipeline-list">
            <p><span>01</span> Classification normalize (3-1)</p>
            <p><span>02</span> Excluded zones + preprocess (3-2)</p>
            <p><span>03</span> EEI core formula execution (3-3)</p>
            <p><span>04</span> SCORE, scale, indicators, grade (3-4 to 3-7)</p>
            <p><span>05</span> Renewable bonus / NZB evaluation (3-8, 3-9)</p>
          </div>
        </article>

        <article class="panel">
          <h2>Module Status</h2>
          <div class="module-grid">
            <div class="module-row"><span>Auth + Login API</span><strong>Active</strong></div>
            <div class="module-row"><span>General EEI Branch</span><strong>Active</strong></div>
            <div class="module-row"><span>Hot-water Branch</span><strong>Active</strong></div>
            <div class="module-row"><span>Renewable Bonus</span><strong>Active</strong></div>
            <div class="module-row"><span>NZB Checks</span><strong>Active</strong></div>
            <div class="module-row"><span>Trace + Persistence</span><strong>Active</strong></div>
          </div>
        </article>

        <article class="panel">
          <h2>UI Coverage</h2>
          <ul>
            <li>Login page wired to DB-backed auth endpoint.</li>
            <li>Calculation page wired to run creation + general full formula.</li>
            <li>Health/readiness status visible for review and screenshots.</li>
          </ul>
        </article>

        <article class="panel action-panel">
          <h2>Operator Actions</h2>
          <p>Run a formal Phase 1 demo case and capture deterministic outputs.</p>
          <button class="btn-primary" @click="navigate('/calculation')">Start Calculation</button>
          <button class="btn-secondary" @click="navigate('/api-console')">Open API Console</button>
        </article>
      </section>
    </section>
  </main>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { logout } from '../auth';
import { navigate } from '../nav';

const API_BASE_URL = (import.meta.env.VITE_API_URL as string | undefined) || 'http://localhost:8080';
const apiHealth = ref('Checking...');
const systemReady = ref('Checking...');

function statusClass(value: string) {
  if (value.toLowerCase().includes('ok') || value.toLowerCase().includes('ready')) return 'status-ok';
  if (value.toLowerCase().includes('fail') || value.toLowerCase().includes('down')) return 'status-bad';
  return '';
}

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
