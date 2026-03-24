import { computed, ref } from 'vue';

export type UiLanguage = 'zh' | 'en';

const STORAGE_KEY = 'bersn_ui_language';

function detectInitialLanguage(): UiLanguage {
  if (typeof window === 'undefined') return 'zh';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === 'zh' || stored === 'en') return stored;
  const browserLang = window.navigator.language.toLowerCase();
  return browserLang.startsWith('zh') ? 'zh' : 'en';
}

const initialLanguage = detectInitialLanguage();
const currentLanguage = ref<UiLanguage>(initialLanguage);

if (typeof document !== 'undefined') {
  document.documentElement.lang = initialLanguage === 'zh' ? 'zh-Hant' : 'en';
}

export function useI18n() {
  const lang = currentLanguage;
  const isZh = computed(() => lang.value === 'zh');

  function setLanguage(next: UiLanguage) {
    lang.value = next;
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, next);
      document.documentElement.lang = next === 'zh' ? 'zh-Hant' : 'en';
    }
  }

  function t(zh: string, en: string): string {
    return isZh.value ? zh : en;
  }

  return {
    lang,
    isZh,
    setLanguage,
    t,
  };
}
