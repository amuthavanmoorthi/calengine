<template>
  <main class="login-page">
    <div class="login-page__lang">
      <LanguageToggle />
    </div>
    <div class="login-page__cloud login-page__cloud--one"></div>
    <div class="login-page__cloud login-page__cloud--two"></div>
    <div class="login-page__orb login-page__orb--top"></div>
    <div class="login-page__orb login-page__orb--bottom"></div>

    <section class="login-card">
      <div class="login-card__visual">
        <div class="floating-icons floating-icons--left">
          <div class="icon-badge icon-badge--panel">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M4 2h16a2 2 0 012 2v16a2 2 0 01-2 2H4a2 2 0 01-2-2V4a2 2 0 012-2zm0 2v6h6V4H4zm8 0v6h6V4h-6zm-8 8v6h6v-6H4zm8 0v6h6v-6h-6z"
              />
            </svg>
          </div>
          <div class="icon-badge icon-badge--energy">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
        </div>

        <div class="floating-icons floating-icons--right">
          <div class="icon-badge icon-badge--leaf">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66.95-2.3c.48.17.98.3 1.34.3C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75C7 8 17 8 17 8z"
              />
            </svg>
          </div>
          <div class="icon-badge icon-badge--gear">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M12 15.5A3.5 3.5 0 118.5 12 3.5 3.5 0 0112 15.5m7.43-2.53c.04-.32.07-.64.07-.97s-.03-.66-.07-1l2.11-1.63a.5.5 0 00.12-.64l-2-3.46a.5.5 0 00-.61-.22l-2.49 1a7.28 7.28 0 00-1.69-.98l-.37-2.65A.5.5 0 0014 2h-4a.5.5 0 00-.5.42l-.37 2.65a7.13 7.13 0 00-1.69.98l-2.49-1a.5.5 0 00-.61.22l-2 3.46a.5.5 0 00.12.64L4.57 11a7 7 0 000 1.94l-2.11 1.63a.5.5 0 00-.12.64l2 3.46a.5.5 0 00.61.22l2.49-1a7.28 7.28 0 001.69.98l.37 2.65a.5.5 0 00.5.42h4a.5.5 0 00.5-.42l.37-2.65a7.13 7.13 0 001.69-.98l2.49 1a.5.5 0 00.61-.22l2-3.46a.5.5 0 00-.12-.64l-2.11-1.63z"
              />
            </svg>
          </div>
        </div>

        <div class="smart-city">
          <div class="smart-city__globe">
            <div class="smart-city__grid"></div>
            <div class="smart-city__continent smart-city__continent--left"></div>
            <div class="smart-city__continent smart-city__continent--right"></div>
          </div>

          <div class="smart-city__platform"></div>

          <div class="smart-city__buildings">
            <div class="building building--sm"></div>
            <div class="building building--md building--solar"></div>
            <div class="building building--lg"></div>
            <div class="building building--md"></div>
            <div class="building building--green"></div>
          </div>

          <div class="windmill windmill--left">
            <div class="windmill__mast"></div>
            <div class="windmill__blades"></div>
          </div>
          <div class="windmill windmill--right">
            <div class="windmill__mast"></div>
            <div class="windmill__blades"></div>
          </div>

          <div class="tree tree--left"></div>
          <div class="tree tree--left-small"></div>
          <div class="tree tree--right"></div>
          <div class="tree tree--right-small"></div>
        </div>

        <div class="corner-icon corner-icon--water">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 2c-5.33 4.55-8 8.48-8 11.8 0 4.98 3.8 8.2 8 8.2s8-3.22 8-8.2c0-3.32-2.67-7.25-8-11.8z" />
          </svg>
        </div>
        <div class="corner-icon corner-icon--sun">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M12 7a5 5 0 100 10 5 5 0 000-10zM12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
            />
          </svg>
        </div>
      </div>

      <div class="login-card__form">
        <div class="login-card__logo">
          <div class="login-card__logo-mark">
            <svg viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M12 3L1 9l4 2.18v6L12 21l7-3.82v-6l2-1.09V17h2V9L12 3zm6.82 6L12 12.72 5.18 9 12 5.28 18.82 9zM17 15.99l-5 2.73-5-2.73v-3.72L12 15l5-2.73v3.72z"
              />
            </svg>
          </div>
          <h1>{{ t('桃園市建築物能源設計平台', 'Taoyuan Building Energy Design Platform') }}</h1>
          <p>{{ t('智慧綠建築能源管理系統', 'Smart Green Building Energy Management System') }}</p>
        </div>

        <form class="login-form" @submit.prevent="onSubmit">
          <label class="login-field">
            <span class="login-field__icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
              </svg>
            </span>
            <input v-model="username" type="text" autocomplete="username" :placeholder="t('帳號', 'Username')" required />
          </label>

          <label class="login-field">
            <span class="login-field__icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </span>
            <input
              v-model="password"
              type="password"
              autocomplete="current-password"
              :placeholder="t('密碼', 'Password')"
              required
            />
          </label>

          <div class="login-form__meta">
            <label class="checkbox">
              <input v-model="rememberMe" type="checkbox" />
              <span>{{ t('記住帳號密碼', 'Remember account and password') }}</span>
            </label>
            <a href="#" @click.prevent>{{ t('忘記密碼?', 'Forgot password?') }}</a>
          </div>

          <button class="login-button" type="submit" :disabled="loading">
            {{ loading ? t('登入中...', 'Signing in...') : t('登入', 'Sign in') }}
          </button>
        </form>

        <p class="demo-account">{{ t('測試帳號', 'Test account') }}: <strong>{{ demoUsername }}</strong> / <strong>{{ demoPassword }}</strong></p>
        <p v-if="error" class="error">{{ error }}</p>

        <p class="login-card__footer">© 2026 {{ t('桃園市政府 建築管理處', 'Taoyuan City Government Building Administration Office') }}</p>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { getDemoPassword, getDemoUsername, LoginError, login } from '../auth';
import LanguageToggle from '../components/LanguageToggle.vue';
import { useI18n } from '../i18n';
import { navigate } from '../nav';

const demoUsername = getDemoUsername();
const demoPassword = getDemoPassword();
const { t } = useI18n();
const username = ref('');
const password = ref('');
const rememberMe = ref(false);
const error = ref('');
const loading = ref(false);

async function onSubmit() {
  loading.value = true;
  try {
    await login(username.value.trim(), password.value);
    error.value = '';
    navigate('/dashboard');
  } catch (err) {
    if (err instanceof LoginError) {
      error.value = err.kind === 'invalid_credentials'
        ? t('Phase 1 測試帳號或密碼錯誤。', 'Invalid credentials for the Phase 1 test account.')
        : t('登入請求失敗，請檢查 API 部署網址、CORS 設定與網路連線。', 'Login request failed. Check API deployment URL, CORS policy, and network reachability.');
    } else {
      error.value = t('發生未預期的登入錯誤，請檢查瀏覽器主控台與 API 紀錄。', 'Unexpected login error. Check browser console and API logs.');
    }
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.login-page {
  position: relative;
  min-height: 100vh;
  overflow: hidden;
  background: linear-gradient(135deg, #eef9ff 0%, #ebfbf2 48%, #e1f8f7 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
}

.login-page__lang {
  position: absolute;
  top: 18px;
  right: 18px;
  z-index: 2;
}

.login-page__cloud,
.login-page__orb {
  position: absolute;
  pointer-events: none;
}

.login-page__cloud {
  background: rgba(255, 255, 255, 0.45);
  border-radius: 999px;
  filter: blur(26px);
}

.login-page__cloud--one {
  top: 64px;
  left: 72px;
  width: 180px;
  height: 76px;
}

.login-page__cloud--two {
  top: 36px;
  right: 84px;
  width: 240px;
  height: 108px;
}

.login-page__orb {
  border-radius: 999px;
  filter: blur(80px);
}

.login-page__orb--top {
  top: -180px;
  right: -120px;
  width: 460px;
  height: 460px;
  background: radial-gradient(circle, rgba(58, 211, 191, 0.25) 0%, rgba(58, 211, 191, 0) 72%);
}

.login-page__orb--bottom {
  bottom: -180px;
  left: -120px;
  width: 520px;
  height: 520px;
  background: radial-gradient(circle, rgba(73, 142, 255, 0.2) 0%, rgba(73, 142, 255, 0) 72%);
}

.login-card {
  position: relative;
  z-index: 1;
  width: min(1120px, 100%);
  min-height: 640px;
  border-radius: 34px;
  overflow: hidden;
  display: grid;
  grid-template-columns: 1.05fr 0.95fr;
  background: rgba(255, 255, 255, 0.76);
  backdrop-filter: blur(18px);
  box-shadow: 0 26px 70px rgba(39, 96, 122, 0.16);
}

.login-card__visual {
  position: relative;
  overflow: hidden;
  background: linear-gradient(180deg, rgba(226, 244, 255, 0.92) 0%, rgba(217, 247, 236, 0.9) 100%);
}

.floating-icons {
  position: absolute;
  top: 22px;
  display: flex;
  gap: 14px;
}

.floating-icons--left {
  left: 28px;
}

.floating-icons--right {
  right: 28px;
}

.icon-badge,
.corner-icon {
  display: grid;
  place-items: center;
  box-shadow: 0 14px 26px rgba(38, 84, 120, 0.14);
}

.icon-badge {
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.84);
}

.icon-badge svg,
.corner-icon svg,
.login-card__logo-mark svg {
  width: 28px;
  height: 28px;
}

.icon-badge--panel {
  width: 58px;
  height: 58px;
  color: #0b9e79;
}

.icon-badge--energy {
  width: 50px;
  height: 50px;
  color: white;
  background: linear-gradient(135deg, #ffca33 0%, #ff9f1b 100%);
}

.icon-badge--leaf {
  width: 50px;
  height: 50px;
  color: white;
  background: linear-gradient(135deg, #34d980 0%, #08b58b 100%);
}

.icon-badge--gear {
  width: 58px;
  height: 58px;
  color: #75849b;
}

.smart-city {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.smart-city__globe {
  position: absolute;
  top: 53%;
  left: 50%;
  width: 320px;
  height: 170px;
  transform: translate(-50%, -20%);
  border-radius: 0 0 170px 170px;
  background: linear-gradient(180deg, #2ad0df 0%, #2f6ef0 100%);
  overflow: hidden;
  box-shadow: 0 18px 40px rgba(37, 125, 214, 0.28);
}

.smart-city__grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(255, 255, 255, 0.24) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255, 255, 255, 0.24) 1px, transparent 1px);
  background-size: 20px 20px;
}

.smart-city__continent {
  position: absolute;
  border-radius: 999px;
  filter: blur(4px);
  background: rgba(67, 206, 145, 0.46);
}

.smart-city__continent--left {
  width: 70px;
  height: 44px;
  top: 44px;
  left: 58px;
}

.smart-city__continent--right {
  width: 54px;
  height: 34px;
  top: 68px;
  right: 64px;
}

.smart-city__platform {
  position: absolute;
  top: calc(53% - 120px);
  left: 50%;
  width: 250px;
  height: 68px;
  transform: translateX(-50%);
  border-radius: 120px 120px 0 0;
  background: linear-gradient(180deg, #37c375 0%, #189f5f 100%);
}

.smart-city__buildings {
  position: absolute;
  top: calc(53% - 184px);
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: flex-end;
  gap: 8px;
}

.building {
  position: relative;
  border-radius: 12px 12px 0 0;
  background: linear-gradient(180deg, #a3adbd 0%, #7c879b 100%);
}

.building::after {
  content: '';
  position: absolute;
  top: 8px;
  left: 6px;
  right: 6px;
  bottom: 8px;
  background-image: repeating-linear-gradient(
    to bottom,
    rgba(111, 224, 255, 0.56) 0 3px,
    transparent 3px 9px
  );
  border-radius: 8px 8px 0 0;
  opacity: 0.85;
}

.building--sm {
  width: 34px;
  height: 74px;
}

.building--md {
  width: 44px;
  height: 114px;
}

.building--lg {
  width: 62px;
  height: 148px;
  background: linear-gradient(180deg, #19b2d8 0%, #0d88bd 100%);
}

.building--solar::before {
  content: '';
  position: absolute;
  top: -8px;
  left: 4px;
  right: 4px;
  height: 12px;
  border-radius: 8px 8px 0 0;
  background: linear-gradient(180deg, #4d7cf0 0%, #2f5bd9 100%);
}

.building--green {
  width: 36px;
  height: 68px;
  background: linear-gradient(180deg, #24b772 0%, #0d9358 100%);
}

.windmill {
  position: absolute;
}

.windmill--left {
  top: calc(53% - 174px);
  left: calc(50% - 142px);
}

.windmill--right {
  top: calc(53% - 186px);
  right: calc(50% - 156px);
}

.windmill__mast {
  width: 3px;
  height: 72px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 999px;
}

.windmill__blades {
  position: absolute;
  top: -12px;
  left: -14px;
  width: 30px;
  height: 30px;
  animation: spin 4s linear infinite;
}

.windmill__blades::before,
.windmill__blades::after {
  content: '';
  position: absolute;
  inset: 0;
  background:
    linear-gradient(to bottom, transparent 0 2px, rgba(255, 255, 255, 0.96) 2px 15px, transparent 15px 100%);
}

.windmill__blades::after {
  transform: rotate(120deg);
}

.windmill__blades {
  background:
    linear-gradient(to bottom, transparent 0 2px, rgba(255, 255, 255, 0.96) 2px 15px, transparent 15px 100%);
  transform: rotate(240deg);
}

.tree {
  position: absolute;
  border-radius: 999px;
  background: linear-gradient(180deg, #1aac69 0%, #0e8a56 100%);
}

.tree--left {
  top: calc(53% - 26px);
  left: calc(50% - 110px);
  width: 18px;
  height: 32px;
}

.tree--left-small {
  top: calc(53% - 18px);
  left: calc(50% - 88px);
  width: 14px;
  height: 24px;
}

.tree--right {
  top: calc(53% - 24px);
  right: calc(50% - 108px);
  width: 18px;
  height: 30px;
}

.tree--right-small {
  top: calc(53% - 16px);
  right: calc(50% - 84px);
  width: 14px;
  height: 22px;
}

.corner-icon {
  position: absolute;
  width: 54px;
  height: 54px;
}

.corner-icon--water {
  bottom: 34px;
  left: 38px;
  color: white;
  background: linear-gradient(135deg, #4aa3ff 0%, #12b7d5 100%);
  border-radius: 16px;
}

.corner-icon--sun {
  right: 54px;
  bottom: 28px;
  width: 58px;
  height: 58px;
  color: white;
  background: linear-gradient(135deg, #ffe37c 0%, #ffbf3b 100%);
  border-radius: 999px;
}

.login-card__form {
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 56px 64px;
  background: rgba(255, 255, 255, 0.44);
}

.login-card__logo {
  text-align: center;
  margin-bottom: 34px;
}

.login-card__logo-mark {
  width: 88px;
  height: 88px;
  margin: 0 auto 22px;
  display: grid;
  place-items: center;
  border-radius: 28px;
  color: white;
  background: linear-gradient(135deg, #31d6b4 0%, #11a6e0 100%);
  box-shadow: 0 16px 28px rgba(21, 170, 169, 0.26);
}

.login-card__logo h1 {
  margin: 0 0 8px;
  font-size: 2rem;
  font-weight: 900;
  color: #1d2b44;
}

.login-card__logo p {
  margin: 0;
  color: #6f7f97;
  font-size: 0.95rem;
}

.login-form {
  width: 100%;
  max-width: 382px;
  margin: 0 auto;
}

.login-field {
  position: relative;
  display: block;
  margin-bottom: 20px;
}

.login-field__icon {
  position: absolute;
  top: 50%;
  left: 18px;
  transform: translateY(-50%);
  color: #94a0b4;
  display: grid;
  place-items: center;
}

.login-field__icon svg {
  width: 20px;
  height: 20px;
}

.login-field input {
  width: 100%;
  padding: 17px 18px 17px 54px;
  border-radius: 16px;
  border: 1px solid #dbe4ef;
  background: rgba(255, 255, 255, 0.94);
  color: #22314a;
  font-size: 0.98rem;
  box-shadow: 0 6px 16px rgba(39, 96, 122, 0.06);
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.login-field input:focus {
  outline: none;
  border-color: #2bc7aa;
  box-shadow: 0 0 0 4px rgba(43, 199, 170, 0.15);
}

.login-form__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 22px;
  color: #6b7890;
  font-size: 0.94rem;
}

.checkbox {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.checkbox input {
  width: 16px;
  height: 16px;
  accent-color: #16c8aa;
}

.login-form__meta a {
  color: #12a684;
  text-decoration: none;
  font-weight: 600;
}

.login-button {
  width: 100%;
  border: 0;
  border-radius: 18px;
  padding: 16px 18px;
  color: white;
  font-size: 1.05rem;
  font-weight: 800;
  background: linear-gradient(90deg, #19c78f 0%, #14b0d7 100%);
  box-shadow: 0 14px 28px rgba(20, 176, 215, 0.24);
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
}

.login-button:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 18px 30px rgba(20, 176, 215, 0.28);
}

.login-button:disabled {
  cursor: not-allowed;
  opacity: 0.7;
}

.demo-account {
  margin: 18px auto 10px;
  width: 100%;
  max-width: 382px;
  color: #637188;
  font-size: 0.9rem;
  text-align: center;
}

.error {
  margin: 0 auto 18px;
  width: 100%;
  max-width: 382px;
  color: #bf3029;
  font-weight: 700;
  text-align: center;
}

.login-card__footer {
  margin: 18px 0 0;
  text-align: center;
  color: #94a0b4;
  font-size: 0.85rem;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 1024px) {
  .login-card {
    grid-template-columns: 1fr;
    min-height: auto;
  }

  .login-card__visual {
    min-height: 360px;
  }

  .smart-city {
    transform: scale(0.88);
    transform-origin: center;
  }
}

@media (max-width: 720px) {
  .login-page {
    padding: 16px;
  }

  .login-card__visual {
    min-height: 280px;
  }

  .login-card__form {
    padding: 38px 24px;
  }

  .login-card__logo h1 {
    font-size: 1.65rem;
  }

  .login-form__meta {
    flex-direction: column;
    align-items: flex-start;
  }

  .smart-city {
    transform: scale(0.72);
  }

  .floating-icons,
  .corner-icon {
    transform: scale(0.82);
    transform-origin: top;
  }
}

@media (max-width: 560px) {
  .login-page {
    padding: 12px;
  }

  .login-page__lang {
    top: 12px;
    right: 12px;
  }

  .login-card {
    border-radius: 24px;
  }

  .login-card__visual {
    min-height: 220px;
  }

  .login-card__form {
    padding: 28px 18px;
  }

  .login-card__logo {
    margin-bottom: 26px;
  }

  .login-card__logo-mark {
    width: 72px;
    height: 72px;
    margin-bottom: 18px;
    border-radius: 22px;
  }

  .login-card__logo h1 {
    font-size: 1.45rem;
  }

  .login-card__logo p,
  .demo-account,
  .login-form__meta,
  .login-card__footer {
    font-size: 0.85rem;
  }

  .login-field {
    margin-bottom: 16px;
  }

  .login-field__icon {
    left: 16px;
  }

  .login-field input {
    padding: 15px 16px 15px 50px;
    border-radius: 14px;
    font-size: 0.95rem;
  }

  .login-button {
    padding: 15px 16px;
    border-radius: 16px;
    font-size: 1rem;
  }

  .floating-icons,
  .corner-icon {
    display: none;
  }

  .smart-city {
    transform: scale(0.58);
  }

  .login-page__cloud--one,
  .login-page__cloud--two {
    opacity: 0.75;
  }
}
</style>
