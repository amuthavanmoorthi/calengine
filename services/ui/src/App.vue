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
import { navigate, subscribeNavigation } from './nav';

const path = ref(window.location.pathname || '/login');

function syncPath() {
  const nextPath = window.location.pathname || '/login';
  if (!isLoggedIn() && nextPath !== '/login') {
    navigate('/login');
    return;
  }
  path.value = nextPath;
}

onMounted(() => {
  syncPath();
  cleanupNavigationSubscription = subscribeNavigation(syncPath);
});

let cleanupNavigationSubscription: (() => void) | null = null;

onBeforeUnmount(() => cleanupNavigationSubscription?.());
</script>
