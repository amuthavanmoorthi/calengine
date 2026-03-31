<template>
  <LoginPage v-if="path === '/login'" />
  <DashboardPage v-else-if="path === '/dashboard'" />
  <CalculationPage v-else-if="path === '/calculation'" />
  <ApiConsolePage v-else-if="path === '/api-console'" />
  <SubmissionPage v-else-if="path === '/submission'" />
  <LoginPage v-else />
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import LoginPage from './views/LoginPage.vue';
import DashboardPage from './views/DashboardPage.vue';
import CalculationPage from './views/CalculationPage.vue';
import ApiConsolePage from './views/ApiConsolePage.vue';
import SubmissionPage from './views/SubmissionPage.vue';
import { isLoggedIn } from './auth';
import { subscribeNavigation } from './nav';

const path = ref(window.location.pathname || '/login');

function syncPath() {
  const nextPath = window.location.pathname || '/login';
  if (nextPath === '/login') {
    path.value = '/login';
    return;
  }
  if (!isLoggedIn()) {
    window.history.replaceState({}, '', '/login');
    path.value = '/login';
    return;
  }
  path.value = nextPath;
}

function handleVisibilityChange() {
  if (document.visibilityState === 'visible') {
    syncPath();
  }
}

onMounted(() => {
  syncPath();
  cleanupNavigationSubscription = subscribeNavigation(syncPath);
  window.addEventListener('pageshow', syncPath);
  window.addEventListener('focus', syncPath);
  document.addEventListener('visibilitychange', handleVisibilityChange);
});

let cleanupNavigationSubscription: (() => void) | null = null;

onBeforeUnmount(() => {
  cleanupNavigationSubscription?.();
  window.removeEventListener('pageshow', syncPath);
  window.removeEventListener('focus', syncPath);
  document.removeEventListener('visibilitychange', handleVisibilityChange);
});
</script>
