import {
  initializeStore,
  registerUser,
  createOtp,
  verifyOtp,
  getOtpState,
  canResendOtp,
  touchOtpResend,
  getUserByEmail,
  setCurrentUser,
  getCurrentUser,
  createAdhocThread,
  getThreadsForUser,
  getRequestById,
  getBookingByRequestId,
  markUserVerified,
  addMessageToThread
} from '../state/store.js';
import { applyI18n, ensureLocale, getLocale, setLocale, t } from './helpro-i18n.js';

const routeRenderers = {
  '/language': renderLanguage,
  '/auth': renderAuth,
  '/auth/verify': renderVerify,
  '/onboarding/chat': renderChat
};

const friendlyPaths = {
  '/language': '/language',
  '/auth': '/auth',
  '/auth/verify': '/auth/verify',
  '/onboarding/chat': '/onboarding/chat'
};

const htmlPaths = {
  '/language': '/language.html',
  '/auth': '/auth.html',
  '/auth/verify': '/auth-verify.html',
  '/onboarding/chat': '/onboarding-chat.html'
};

let currentRoute = null;
let disposer = null;

function normalizePath(path) {
  if (!path) return '';
  return path.replace(/\.html$/, '').replace(/#.*/, '').trim();
}

function resolveRoute() {
  const dataset = document.body.dataset.route;
  const hashRoute = normalizePath(window.location.hash.replace('#', ''));
  const pathname = normalizePath(window.location.pathname);
  const options = [dataset, hashRoute, pathname].filter(Boolean);
  const match = options.find((candidate) => routeRenderers[candidate]);
  return match || '/language';
}

function updateHistory(route, replace = false) {
  const preferHtml = window.location.pathname.endsWith('.html');
  const target = preferHtml ? htmlPaths[route] : friendlyPaths[route];
  if (!target) return;
  if (replace) window.history.replaceState({ route }, '', target);
  else window.history.pushState({ route }, '', target);
}

function navigate(route, { replace = false } = {}) {
  const targetRoute = routeRenderers[route] ? route : '/language';
  updateHistory(targetRoute, replace);
  render(targetRoute);
}

function render(route) {
  const app = document.getElementById('app');
  if (!app) return;
  if (disposer) disposer();
  app.innerHTML = '';
  currentRoute = route;
  const renderer = routeRenderers[route] || routeRenderers['/language'];
  disposer = renderer(app) || null;
  applyI18n(app);
}

document.addEventListener('DOMContentLoaded', () => {
  initializeStore();
  const start = resolveRoute();
  render(start);
  window.addEventListener('popstate', (event) => {
    const target = event.state?.route || resolveRoute();
    render(target);
  });
});

function requireLocale() {
  const locale = getLocale();
  if (!locale) {
    navigate('/language', { replace: true });
    return false;
  }
  ensureLocale(locale);
  return true;
}

function renderLanguage(container) {
  const stored = getLocale();
  if (stored) {
    ensureLocale(stored);
    const notice = document.createElement('div');
    notice.className = 'max-w-xl mx-auto p-6 text-center text-sm text-gray-300';
    notice.textContent = t('language.skip');
    container.appendChild(notice);
    setTimeout(() => navigate('/auth', { replace: true }), 300);
    return null;
  }

  container.innerHTML = `
    <div class="min-h-screen flex flex-col items-center justify-center px-6 py-12">
      <div class="w-full max-w-xl space-y-6 glass-card rounded-3xl p-8">
        <div class="flex items-center justify-between">
          <div>
            <p class="pill">${t('app.brand')}</p>
            <p class="text-sm text-gray-400" data-i18n="app.subtitle">${t('app.subtitle')}</p>
          </div>
        </div>
        <div class="space-y-2">
          <h1 class="text-2xl font-semibold" data-i18n="language.title">${t('language.title')}</h1>
          <p class="text-gray-400" data-i18n="language.subtitle">${t('language.subtitle')}</p>
        </div>
        <div class="grid gap-3 md:grid-cols-3" id="language-grid"></div>
      </div>
    </div>
  `;

  const grid = container.querySelector('#language-grid');
  const options = [
    { code: 'fa', label: t('language.fa') },
    { code: 'sv', label: t('language.sv') },
    { code: 'en', label: t('language.en') }
  ];
  options.forEach((option) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'panel flex flex-col gap-2 p-4 text-left hover:border-white/40 transition';
    button.innerHTML = `
      <div class="flex items-center justify-between">
        <span class="font-semibold text-white">${option.label}</span>
        <span class="pill">${t('language.cta')} ${option.label}</span>
      </div>
      <p class="text-sm text-gray-400">${option.code.toUpperCase()}</p>
    `;
    button.addEventListener('click', () => {
      setLocale(option.code);
      navigate('/auth');
    });
    grid.appendChild(button);
  });
  return null;
}

function renderAuth(container) {
  if (!requireLocale()) return null;
  const params = new URLSearchParams(window.location.search);
  const initialTab = params.get('tab') === 'register' ? 'register' : 'login';
  const prefillEmail = params.get('email') || '';
  const verified = params.get('verified');

  container.innerHTML = `
    <div class="min-h-screen flex flex-col items-center px-4 py-10">
      <div class="w-full max-w-3xl space-y-6">
        <div class="flex items-center justify-between">
          <div>
            <p class="pill">${t('app.brand')}</p>
            <p class="text-sm text-gray-400" data-i18n="auth.subtitle">${t('auth.subtitle')}</p>
          </div>
          <a class="text-sm text-emerald-300" href="/language" data-i18n="language.title">${t('language.title')}</a>
        </div>
        <div class="glass-card rounded-3xl p-6">
          <div class="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-4">
            <div>
              <p class="text-xs uppercase tracking-[0.2em] text-gray-400" data-i18n="app.subtitle">${t('app.subtitle')}</p>
              <h2 class="text-xl font-semibold" data-i18n="auth.title">${t('auth.title')}</h2>
            </div>
            ${verified ? `<span class="pill bg-emerald-500/10 text-emerald-200" data-i18n="auth.verified">${t('auth.verified')}</span>` : ''}
          </div>
          <div class="tab-group" role="tablist">
            <button class="tab" data-tab="login" aria-selected="${initialTab === 'login'}" data-i18n="auth.tab.login">${t('auth.tab.login')}</button>
            <button class="tab" data-tab="register" aria-selected="${initialTab === 'register'}" data-i18n="auth.tab.register">${t('auth.tab.register')}</button>
          </div>
          <div class="grid gap-6" id="auth-panels">
            <div class="auth-panel" data-panel="login">
              <button class="btn-secondary w-full rounded-2xl" type="button" data-i18n="auth.google">${t('auth.google')}</button>
              <div class="flex items-center gap-2 text-xs text-gray-400">
                <span class="flex-1 h-px bg-white/10"></span>
                <span data-i18n="auth.or">${t('auth.or')}</span>
                <span class="flex-1 h-px bg-white/10"></span>
              </div>
              <form id="login-form" class="space-y-3">
                <label class="block text-sm text-gray-300">
                  <span data-i18n="auth.email">${t('auth.email')}</span>
                  <input type="email" name="email" class="form-input" required value="${prefillEmail}" autocomplete="email" />
                </label>
                <label class="block text-sm text-gray-300">
                  <span data-i18n="auth.password">${t('auth.password')}</span>
                  <input type="password" name="password" class="form-input" required minlength="8" autocomplete="current-password" />
                </label>
                <button type="submit" class="btn-primary w-full rounded-2xl" data-i18n="auth.login.cta">${t('auth.login.cta')}</button>
                <p class="text-xs text-gray-400" data-i18n="auth.forgot">${t('auth.forgot')}</p>
                <p id="login-error" class="text-sm text-rose-300"></p>
              </form>
            </div>
            <div class="auth-panel" data-panel="register">
              <button class="btn-secondary w-full rounded-2xl" type="button" data-i18n="auth.google">${t('auth.google')}</button>
              <div class="flex items-center gap-2 text-xs text-gray-400">
                <span class="flex-1 h-px bg-white/10"></span>
                <span data-i18n="auth.or">${t('auth.or')}</span>
                <span class="flex-1 h-px bg-white/10"></span>
              </div>
              <form id="register-form" class="space-y-3">
                <label class="block text-sm text-gray-300">
                  <span data-i18n="auth.name">${t('auth.name')}</span>
                  <input type="text" name="name" class="form-input" required autocomplete="name" />
                </label>
                <label class="block text-sm text-gray-300">
                  <span data-i18n="auth.email">${t('auth.email')}</span>
                  <input type="email" name="email" class="form-input" required autocomplete="email" />
                </label>
                <label class="block text-sm text-gray-300">
                  <span data-i18n="auth.password">${t('auth.password')}</span>
                  <input type="password" name="password" class="form-input" required minlength="8" autocomplete="new-password" />
                </label>
                <button type="submit" class="btn-primary w-full rounded-2xl" data-i18n="auth.register.cta">${t('auth.register.cta')}</button>
                <p id="register-error" class="text-sm text-rose-300"></p>
                <p id="register-meta" class="text-sm text-emerald-300"></p>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  const tabs = Array.from(container.querySelectorAll('.tab'));
  const panels = Array.from(container.querySelectorAll('.auth-panel'));
  const selectTab = (tab) => {
    tabs.forEach((button) => {
      const isActive = button.dataset.tab === tab;
      button.setAttribute('aria-selected', isActive);
      button.classList.toggle('active', isActive);
    });
    panels.forEach((panel) => {
      panel.classList.toggle('hidden', panel.dataset.panel !== tab);
    });
  };
  selectTab(initialTab);
  tabs.forEach((button) => button.addEventListener('click', () => selectTab(button.dataset.tab)));

  const loginForm = container.querySelector('#login-form');
  loginForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    const errorEl = container.querySelector('#login-error');
    errorEl.textContent = '';
    const data = new FormData(loginForm);
    const email = String(data.get('email') || '').trim();
    const password = String(data.get('password') || '').trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errorEl.textContent = t('auth.validation.email');
      return;
    }
    if (!password || password.length < 8) {
      errorEl.textContent = t('auth.validation.password');
      return;
    }
    const user = getUserByEmail(email);
    if (!user) {
      errorEl.textContent = t('auth.validation.email');
      return;
    }
    setCurrentUser(user.id);
    navigate('/onboarding/chat');
  });

  const registerForm = container.querySelector('#register-form');
  registerForm?.addEventListener('submit', (event) => {
    event.preventDefault();
    const errorEl = container.querySelector('#register-error');
    const metaEl = container.querySelector('#register-meta');
    errorEl.textContent = '';
    metaEl.textContent = '';
    const data = new FormData(registerForm);
    const name = String(data.get('name') || '').trim();
    const email = String(data.get('email') || '').trim();
    const password = String(data.get('password') || '').trim();
    const locale = getLocale();

    if (!locale) {
      errorEl.textContent = t('auth.validation.missingLocale');
      return;
    }
    if (!name) {
      errorEl.textContent = t('auth.validation.name');
      return;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errorEl.textContent = t('auth.validation.email');
      return;
    }
    if (!password || password.length < 8) {
      errorEl.textContent = t('auth.validation.password');
      return;
    }
    registerUser({ name, email, password, role: 'customer' });
    createOtp(email);
    metaEl.textContent = `${t('auth.otp.created')} (${email})`;
    navigate(`/auth/verify?email=${encodeURIComponent(email)}`);
  });

  return () => tabs.forEach((btn) => btn.replaceWith(btn.cloneNode(true)));
}

function renderVerify(container) {
  if (!requireLocale()) return null;
  const params = new URLSearchParams(window.location.search);
  const email = params.get('email');
  if (!email) {
    navigate('/auth', { replace: true });
    return null;
  }
  const otp = getOtpState();
  const cooldownSeconds = otp ? Math.max(0, Math.ceil((otp.resendAvailableAt - Date.now()) / 1000)) : 0;

  container.innerHTML = `
    <div class="min-h-screen flex flex-col items-center px-4 py-10">
      <div class="w-full max-w-xl glass-card rounded-3xl p-6 space-y-5">
        <p class="pill">${t('app.brand')}</p>
        <div class="space-y-2">
          <h1 class="text-2xl font-semibold" data-i18n="verify.title">${t('verify.title')}</h1>
          <p class="text-gray-400" data-i18n="verify.subtitle">${t('verify.subtitle')}</p>
          <p class="text-sm text-gray-300">${t('verify.sent')} ${email}</p>
        </div>
        <form id="verify-form" class="space-y-4">
          <label class="block text-sm text-gray-300">
            <span data-i18n="verify.label">${t('verify.label')}</span>
            <input id="otp-input" inputmode="numeric" pattern="[0-9]*" maxlength="6" class="form-input tracking-[0.3em] text-center" placeholder="000000" required />
          </label>
          <button type="submit" class="btn-primary w-full rounded-2xl" data-i18n="verify.submit">${t('verify.submit')}</button>
          <p id="verify-error" class="text-sm text-rose-300"></p>
        </form>
        <div class="flex items-center justify-between text-sm text-gray-300">
          <button id="edit-email" type="button" class="text-emerald-300 underline" data-i18n="verify.edit">${t('verify.edit')}</button>
          <button id="resend-otp" type="button" class="pill">${cooldownSeconds > 0 ? `${t('verify.cooldown')} ${cooldownSeconds}s` : t('verify.resend')}</button>
        </div>
      </div>
    </div>
  `;

  const errorEl = container.querySelector('#verify-error');
  const form = container.querySelector('#verify-form');
  const input = container.querySelector('#otp-input');
  const resendBtn = container.querySelector('#resend-otp');
  const editBtn = container.querySelector('#edit-email');

  form?.addEventListener('submit', (event) => {
    event.preventDefault();
    errorEl.textContent = '';
    const code = input.value.trim();
    if (!code || code.length !== 6) {
      errorEl.textContent = t('verify.error');
      return;
    }
    if (!verifyOtp(email, code)) {
      errorEl.textContent = t('verify.error');
      return;
    }
    markUserVerified(email);
    navigate(`/auth?tab=login&email=${encodeURIComponent(email)}&verified=1`);
  });

  editBtn?.addEventListener('click', () => navigate(`/auth?tab=register&email=${encodeURIComponent(email)}`));

  let cooldown = cooldownSeconds;
  if (cooldown > 0) resendBtn.disabled = true;
  const interval = setInterval(() => {
    cooldown -= 1;
    if (cooldown <= 0) {
      resendBtn.disabled = false;
      resendBtn.textContent = t('verify.resend');
      clearInterval(interval);
    } else {
      resendBtn.textContent = `${t('verify.cooldown')} ${cooldown}s`;
    }
  }, 1000);

  resendBtn?.addEventListener('click', () => {
    if (!canResendOtp()) return;
    touchOtpResend(email);
    resendBtn.disabled = true;
    let timer = 30;
    const tick = setInterval(() => {
      timer -= 1;
      if (timer <= 0) {
        resendBtn.disabled = false;
        resendBtn.textContent = t('verify.resend');
        clearInterval(tick);
      } else {
        resendBtn.textContent = `${t('verify.cooldown')} ${timer}s`;
      }
    }, 1000);
  });

  return () => clearInterval(interval);
}

function renderChat(container) {
  if (!requireLocale()) return null;
  const user = getCurrentUser();
  if (!user) {
    navigate('/auth', { replace: true });
    return null;
  }
  const threads = getThreadsForUser(user.id);

  container.innerHTML = `
    <div class="min-h-screen bg-gradient-to-b from-gray-950 via-black to-gray-950">
      <header class="app-shell sticky top-0 z-30 border-b border-white/5">
        <div class="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <div>
            <p class="pill">${t('app.brand')}</p>
            <p class="text-sm text-gray-400" data-i18n="chat.subtitle">${t('chat.subtitle')}</p>
          </div>
          <button id="logout" class="btn-secondary rounded-2xl" type="button" data-i18n="chat.logout">${t('chat.logout')}</button>
        </div>
      </header>
      <main class="mx-auto max-w-5xl px-4 py-8 space-y-4">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p class="text-xs uppercase tracking-[0.2em] text-gray-400" data-i18n="chat.title">${t('chat.title')}</p>
            <h1 class="text-2xl font-semibold">${user.name || user.email}</h1>
          </div>
          <button id="new-thread" class="btn-primary rounded-2xl" type="button" data-i18n="chat.newThread">${t('chat.newThread')}</button>
        </div>
        <div class="grid gap-4 md:grid-cols-[1.3fr,1fr]">
          <section class="glass-card rounded-3xl p-4 space-y-4" id="thread-list"></section>
          <section class="glass-card rounded-3xl p-4 space-y-3">
            <div class="flex items-center justify-between">
              <p class="text-sm text-gray-300" data-i18n="chat.activeRequest">${t('chat.activeRequest')}</p>
              <span class="pill">${user.role || 'customer'}</span>
            </div>
            <div id="request-summary" class="space-y-1 text-sm text-gray-200"></div>
            <div id="booking-summary" class="space-y-1 text-sm text-gray-200"></div>
          </section>
        </div>
      </main>
    </div>
  `;

  const list = container.querySelector('#thread-list');
  const requestSummary = container.querySelector('#request-summary');
  const bookingSummary = container.querySelector('#booking-summary');

  function renderThreads() {
    list.innerHTML = '';
    if (!threads.length) {
      list.innerHTML = `<p class="text-sm text-gray-400" data-i18n="chat.empty">${t('chat.empty')}</p>`;
      return;
    }
    threads.forEach((thread) => {
      const request = getRequestById(thread.requestId);
      const booking = getBookingByRequestId(thread.requestId);
      const lastMessage = thread.messages[thread.messages.length - 1];
      const card = document.createElement('article');
      card.className = 'panel p-4 rounded-2xl space-y-2';
      card.innerHTML = `
        <div class="flex items-center justify-between">
          <div>
            <p class="font-semibold text-white">${request?.summary || 'New request'}</p>
            <p class="text-xs text-gray-400" data-i18n="chat.lastMessage">${t('chat.lastMessage')}</p>
          </div>
          <span class="pill">${booking?.status || 'draft'}</span>
        </div>
        <p class="text-sm text-gray-300">${lastMessage?.text || ''}</p>
        <div class="flex items-center justify-end gap-2">
          <button class="btn-ghost" data-thread="${thread.id}" data-action="resume" data-i18n="chat.resume">${t('chat.resume')}</button>
        </div>
      `;
      list.appendChild(card);
    });
  }

  function hydrateSidebars() {
    const request = threads[0] ? getRequestById(threads[0].requestId) : null;
    const booking = threads[0] ? getBookingByRequestId(threads[0].requestId) : null;
    requestSummary.innerHTML = request
      ? `<p class="text-white">${request.summary}</p><p class="text-gray-400 text-sm">${new Date(request.createdAt).toLocaleString()}</p>`
      : '<p class="text-gray-400">No request selected.</p>';
    bookingSummary.innerHTML = booking
      ? `<p class="text-white">${t('chat.bookingStatus')}: ${booking.status}</p><p class="text-gray-400 text-sm">${booking.scheduledAt ? new Date(booking.scheduledAt).toLocaleString() : 'TBD'}</p>`
      : '<p class="text-gray-400">No booking yet.</p>';
  }

  renderThreads();
  hydrateSidebars();

  list.addEventListener('click', (event) => {
    const target = event.target;
    if (target.dataset.action === 'resume') {
      const threadId = target.dataset.thread;
      addMessageToThread(threadId, 'user', 'Picked up where we left off.');
      renderThreads();
    }
  });

  container.querySelector('#new-thread')?.addEventListener('click', () => {
    const { thread } = createAdhocThread(user.id, 'New helpro intake');
    threads.unshift(thread);
    renderThreads();
    hydrateSidebars();
  });

  container.querySelector('#logout')?.addEventListener('click', () => {
    window.localStorage.removeItem('helpro.currentUser');
    navigate('/auth', { replace: true });
  });

  return null;
}
