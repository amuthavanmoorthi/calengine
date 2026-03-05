<template>
  <main class="page-shell">
    <section class="card auth-card">
      <p class="eyebrow">BERSn Calculation System - Phase 1</p>
      <h1>Login</h1>
      <p class="version">v1.0-Phase1</p>

      <form class="form-grid" @submit.prevent="onSubmit">
        <label class="field">
          <span>Username</span>
          <input v-model="username" type="text" autocomplete="username" required />
        </label>

        <label class="field">
          <span>Password</span>
          <input v-model="password" type="password" autocomplete="current-password" required />
        </label>

        <button class="btn-primary" type="submit" :disabled="loading">
          {{ loading ? 'Signing in...' : 'Login' }}
        </button>
      </form>

      <p class="hint">
        Test account: <strong>{{ demoUsername }}</strong> / <strong>{{ demoPassword }}</strong>
      </p>
      <p v-if="error" class="error">{{ error }}</p>
    </section>
  </main>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { getDemoPassword, getDemoUsername, login } from '../auth';
import { navigate } from '../nav';

const demoUsername = getDemoUsername();
const demoPassword = getDemoPassword();
const username = ref('');
const password = ref('');
const error = ref('');
const loading = ref(false);

async function onSubmit() {
  loading.value = true;
  let ok = false;
  try {
    ok = await login(username.value.trim(), password.value);
  } catch (_) {
    ok = false;
  }
  loading.value = false;
  if (!ok) {
    error.value = 'Invalid credentials for Phase 1 test account.';
    return;
  }
  error.value = '';
  navigate('/dashboard');
}
</script>
