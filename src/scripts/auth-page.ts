import { bindThemeToggle, initTheme } from './theme.js';
import { setLanguage } from './i18n.js';
import { getSession, sendEmailOtp, signInWithGoogle } from '../lib/auth.ts';

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
    errorEl && (errorEl.textContent = 'Please enter an email.');
    return;
  }
  errorEl && (errorEl.textContent = '');
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
    errorEl && (errorEl.textContent = error?.message || 'Failed to send code');
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = 'Send code';
    }
  }
}

function initForms() {
  const loginForm = document.getElementById('login-form') as HTMLFormElement | null;
  const registerForm = document.getElementById('register-form') as HTMLFormElement | null;
  loginForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    handleForm(loginForm, 'login');
  });
  registerForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    handleForm(registerForm, 'register');
  });

  const loginGoogle = document.getElementById('login-google');
  const registerGoogle = document.getElementById('register-google');
  [loginGoogle, registerGoogle].forEach((btn) => {
    btn?.addEventListener('click', async () => {
      (btn as HTMLButtonElement).disabled = true;
      (btn as HTMLButtonElement).textContent = 'Redirecting...';
      try {
        await signInWithGoogle();
      } catch (error) {
        const el = document.getElementById('login-error') || document.getElementById('register-error');
        el && (el.textContent = 'Google sign-in failed.');
      }
    });
  });
}

async function init() {
  initTheme();
  bindThemeToggle();
  const storedLocale = localStorage.getItem('helpro.locale') || 'en';
  await setLanguage(storedLocale, false);

  const session = await getSession();
  if (session) {
    window.location.href = '/app.html';
    return;
  }

  initTabs();
  initForms();
}

document.addEventListener('DOMContentLoaded', init);
