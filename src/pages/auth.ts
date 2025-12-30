import { bindThemeToggle, initTheme } from '../scripts/theme.js';
import { initI18n } from '../scripts/i18n.js';
import { exchangeCodeForSession, getSession, sendEmailOtp, signInWithGoogle } from '../lib/auth.ts';

const envOk = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
let lastError = '';
let lastSessionEmail = '';

function showEnvWarning() {
  if (envOk) return;
  console.error('Supabase env vars missing: VITE_SUPABASE_URL and/or VITE_SUPABASE_ANON_KEY');
  const banner = document.getElementById('env-error');
  if (banner) banner.classList.remove('hidden');
}

function updateDebug(email: string | null) {
  const debug = document.getElementById('auth-debug');
  if (!debug) return;
  if (!import.meta.env.DEV && !new URLSearchParams(window.location.search).has('debug')) return;
  debug.classList.remove('hidden');
  const originEl = document.getElementById('debug-origin');
  const envEl = document.getElementById('debug-env');
  const emailEl = document.getElementById('debug-email');
  const errorEl = document.getElementById('debug-error');
  if (originEl) originEl.textContent = window.location.origin;
  if (envEl) envEl.textContent = envOk ? 'yes' : 'missing';
  if (emailEl) emailEl.textContent = email || lastSessionEmail || '—';
  if (errorEl) errorEl.textContent = lastError || '—';
}

function switchTab(tab: 'login' | 'register') {
  document.querySelectorAll('.tab').forEach((btn) => btn.classList.toggle('active', (btn as HTMLElement).dataset.tab === tab));
  document.querySelectorAll('.tab-panel').forEach((panel) => {
    const active = (panel as HTMLElement).dataset.tab === tab;
    panel.classList.toggle('hidden', !active);
  });
  const url = new URL(window.location.href);
  url.hash = tab;
  window.history.replaceState({}, '', url.toString());
}

function initTabs() {
  document.querySelectorAll('.tab').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tab = (btn as HTMLElement).dataset.tab as 'login' | 'register';
      switchTab(tab);
    });
  });
  const hash = window.location.hash.replace('#', '');
  if (hash === 'register' || hash === 'login') switchTab(hash);
}

async function handleForm(form: HTMLFormElement, mode: 'login' | 'register') {
  const formData = new FormData(form);
  const email = String(formData.get('email') || '').trim();
  const errorEl = document.getElementById(`${mode}-error`);
  if (!email) {
    if (errorEl) errorEl.textContent = 'Please enter an email.';
    return;
  }
  if (errorEl) errorEl.textContent = '';
  const button = form.querySelector('button[type="submit"]') as HTMLButtonElement | null;
  if (button) {
    button.disabled = true;
    button.textContent = 'Sending code...';
  }
  try {
    await sendEmailOtp(email);
    const next = new URL('/verify.html', window.location.origin);
    next.searchParams.set('email', email);
    next.searchParams.set('mode', mode);
    window.location.href = next.toString();
  } catch (error: any) {
    lastError = error?.message || 'Failed to send code';
    console.error('OTP send failed', error);
    if (errorEl) errorEl.textContent = lastError;
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = 'Send code';
    }
    updateDebug(null);
  }
}

function initForms() {
  const loginForm = document.getElementById('login-form') as HTMLFormElement | null;
  const registerForm = document.getElementById('register-form') as HTMLFormElement | null;
  if (loginForm) {
    loginForm.addEventListener('submit', (event) => {
      event.preventDefault();
      handleForm(loginForm, 'login');
    });
  } else {
    console.error('Login form not found');
  }
  if (registerForm) {
    registerForm.addEventListener('submit', (event) => {
      event.preventDefault();
      handleForm(registerForm, 'register');
    });
  } else {
    console.error('Register form not found');
  }

  const loginGoogle = document.getElementById('login-google');
  const registerGoogle = document.getElementById('register-google');
  [loginGoogle, registerGoogle].forEach((btn) => {
    btn?.addEventListener('click', async () => {
      (btn as HTMLButtonElement).disabled = true;
      (btn as HTMLButtonElement).textContent = 'Redirecting...';
      try {
        await signInWithGoogle();
      } catch (error) {
        lastError = error?.message || 'Google sign-in failed.';
        console.error(lastError, error);
        const el = document.getElementById('login-error') || document.getElementById('register-error');
        if (el) el.textContent = lastError;
      } finally {
        updateDebug(null);
      }
    });
  });
}

async function handleOAuthCallback() {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  if (!code) return null;
  try {
    const session = await exchangeCodeForSession(code);
    lastSessionEmail = session?.user?.email || '';
    const clean = new URL(window.location.href);
    clean.searchParams.delete('code');
    clean.searchParams.delete('state');
    window.history.replaceState({}, '', clean.toString());
    if (session) {
      window.location.href = '/app.html#/onboarding';
    }
    return session;
  } catch (error: any) {
    lastError = error?.message || 'OAuth exchange failed';
    console.error(lastError, error);
    updateDebug(null);
    return null;
  }
}

async function init() {
  initTheme();
  bindThemeToggle();
  await initI18n();

  showEnvWarning();
  if (!envOk) {
    lastError = 'Supabase env vars missing';
    updateDebug(null);
    return;
  }

  try {
    await handleOAuthCallback();
    const session = await getSession();
    if (session) {
      lastSessionEmail = session.user?.email || '';
      updateDebug(lastSessionEmail);
      window.location.href = '/app.html';
      return;
    }
  } catch (error: any) {
    lastError = error?.message || 'Auth init failed';
    console.error(lastError, error);
  }

  initTabs();
  initForms();
  updateDebug(lastSessionEmail);
}

document.addEventListener('DOMContentLoaded', init);
