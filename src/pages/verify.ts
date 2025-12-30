import { bindThemeToggle, initTheme } from '../scripts/theme.js';
import { initI18n } from '../scripts/i18n.js';
import { getSession, sendEmailOtp, verifyEmailOtp } from '../lib/auth.ts';

const envOk = Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
let lastError = '';
let lastSessionEmail = '';

let email = '';
let mode: 'login' | 'register' = 'login';
let cooldown = 0;
let cooldownInterval: number | undefined;

function readParams() {
  const params = new URLSearchParams(window.location.search);
  email = params.get('email') || '';
  const requestedMode = params.get('mode');
  if (requestedMode === 'register') mode = 'register';
}

function showEnvWarning() {
  if (envOk) return;
  console.error('Supabase env vars missing: VITE_SUPABASE_URL and/or VITE_SUPABASE_ANON_KEY');
  const banner = document.getElementById('env-error');
  if (banner) banner.classList.remove('hidden');
}

function updateDebug() {
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
  if (emailEl) emailEl.textContent = lastSessionEmail || '—';
  if (errorEl) errorEl.textContent = lastError || '—';
}

function startCooldown() {
  cooldown = 60;
  const resendBtn = document.getElementById('resend-btn') as HTMLButtonElement | null;
  const update = () => {
    if (!resendBtn) return;
    resendBtn.textContent = cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code';
    resendBtn.disabled = cooldown > 0;
  };
  update();
  cooldownInterval = window.setInterval(() => {
    cooldown -= 1;
    update();
    if (cooldown <= 0 && cooldownInterval) window.clearInterval(cooldownInterval);
  }, 1000) as unknown as number;
}

async function handleVerify() {
  const input = document.getElementById('otp-code') as HTMLInputElement | null;
  const status = document.getElementById('verify-status');
  if (!email || !input) {
    if (status) status.textContent = 'Missing email or code.';
    return;
  }
  const token = input.value.trim();
  if (token.length < 6) {
    if (status) status.textContent = 'Enter the 6-digit code.';
    return;
  }
  if (status) status.textContent = 'Verifying...';
  try {
    await verifyEmailOtp(email, token);
    if (status) status.textContent = 'Verified. Please log in. Redirecting...';
    const next = new URL('/auth.html', window.location.origin);
    next.hash = '#login';
    setTimeout(() => (window.location.href = next.toString()), 800);
  } catch (error: any) {
    lastError = error?.message || 'Verification failed';
    console.error(lastError, error);
    if (status) status.textContent = lastError;
  }
  updateDebug();
}

async function handleResend() {
  const status = document.getElementById('verify-status');
  try {
    await sendEmailOtp(email);
    if (status) status.textContent = 'Code resent.';
    startCooldown();
  } catch (error: any) {
    lastError = error?.message || 'Failed to resend';
    console.error(lastError, error);
    if (status) status.textContent = lastError;
  }
  updateDebug();
}

async function init() {
  initTheme();
  bindThemeToggle();
  await initI18n();
  showEnvWarning();
  if (!envOk) {
    lastError = 'Supabase env vars missing';
    updateDebug();
    return;
  }

  readParams();
  if (!email) {
    window.location.href = '/auth.html';
    return;
  }
  const label = document.getElementById('verify-email-label');
  if (label) label.textContent = `Sent to ${email}`;

  document.getElementById('verify-btn')?.addEventListener('click', handleVerify);
  document.getElementById('resend-btn')?.addEventListener('click', handleResend);
  document.getElementById('edit-email')?.addEventListener('click', () => {
    window.location.href = '/auth.html';
  });
  startCooldown();
  try {
    const session = await getSession();
    lastSessionEmail = session?.user?.email || '';
  } catch (error: any) {
    lastError = error?.message || 'Session lookup failed';
    console.error(lastError, error);
  }
  updateDebug();
}

document.addEventListener('DOMContentLoaded', init);
