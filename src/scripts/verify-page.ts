import { bindThemeToggle, initTheme } from './theme.js';
import { setLanguage } from './i18n.js';
import { sendEmailOtp, verifyEmailOtp } from '../lib/auth.ts';

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
    status && (status.textContent = 'Missing email or code.');
    return;
  }
  const token = input.value.trim();
  if (token.length < 6) {
    status && (status.textContent = 'Enter the 6-digit code.');
    return;
  }
  status && (status.textContent = 'Verifying...');
  try {
    await verifyEmailOtp(email, token);
    status && (status.textContent = 'Verified. Please log in. Redirecting...');
    const next = new URL('/auth.html', window.location.origin);
    next.hash = '#login';
    setTimeout(() => (window.location.href = next.toString()), 800);
  } catch (error: any) {
    status && (status.textContent = error?.message || 'Verification failed');
  }
}

async function handleResend() {
  const status = document.getElementById('verify-status');
  try {
    await sendEmailOtp(email);
    status && (status.textContent = 'Code resent.');
    startCooldown();
  } catch (error: any) {
    status && (status.textContent = error?.message || 'Failed to resend');
  }
}

async function init() {
  initTheme();
  bindThemeToggle();
  const storedLocale = localStorage.getItem('helpro.locale') || 'en';
  await setLanguage(storedLocale, false);

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
}

document.addEventListener('DOMContentLoaded', init);
