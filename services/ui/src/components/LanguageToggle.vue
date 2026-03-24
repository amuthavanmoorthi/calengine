<template>
  <div class="lang-toggle" role="group" aria-label="Language switcher">
    <button
      class="lang-toggle__button"
      :class="{ 'lang-toggle__button--active': lang === 'zh' }"
      type="button"
      @click="setLanguage('zh')"
    >
      中文
    </button>
    <button
      class="lang-toggle__button"
      :class="{ 'lang-toggle__button--active': lang === 'en' }"
      type="button"
      @click="setLanguage('en')"
    >
      EN
    </button>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from '../i18n';

const { lang, setLanguage } = useI18n();
</script>

<style scoped>
.lang-toggle {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px;
  border: 1px solid #d8e5f7;
  border-radius: 999px;
  background: #ffffff;
  box-shadow: 0 10px 20px rgba(15, 23, 42, 0.05);
}

.lang-toggle__button {
  min-width: 52px;
  height: 34px;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: #64748b;
  font-size: 0.82rem;
  font-weight: 800;
  cursor: pointer;
  transition: background-color 140ms ease, color 140ms ease;
}

.lang-toggle__button--active {
  background: #2563eb;
  color: #ffffff;
}

@media (max-width: 560px) {
  .lang-toggle__button {
    min-width: 48px;
    height: 32px;
    font-size: 0.78rem;
  }
}
</style>
