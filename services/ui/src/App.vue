<template>
  <LoginPage v-if="path === '/login'" />
  <DashboardPage v-else-if="path === '/dashboard'" />
  <CalculationPage v-else-if="path === '/calculation'" />
  <ApiConsolePage v-else-if="path === '/api-console'" />
  <LoginPage v-else />
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import LoginPage from './views/LoginPage.vue';
import DashboardPage from './views/DashboardPage.vue';
import CalculationPage from './views/CalculationPage.vue';
import ApiConsolePage from './views/ApiConsolePage.vue';
import { isLoggedIn } from './auth';
import { navigate } from './nav';

const path = ref(window.location.pathname || '/login');

function syncPath() {
  const nextPath = window.location.pathname || '/login';
  if (!isLoggedIn() && nextPath !== '/login') {
    navigate('/login');
    return;
  }
  if (isLoggedIn() && nextPath === '/login') {
    navigate('/dashboard');
    return;
  }
  path.value = nextPath;
}

onMounted(() => {
  syncPath();
  window.addEventListener('popstate', syncPath);
});
onBeforeUnmount(() => window.removeEventListener('popstate', syncPath));
</script>
