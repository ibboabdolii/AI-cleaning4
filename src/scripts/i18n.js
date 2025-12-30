const localeFiles = {
  en: new URL('../locales/en.json', import.meta.url).href,
  sv: new URL('../locales/sv.json', import.meta.url).href,
  de: new URL('../locales/de.json', import.meta.url).href,
  es: new URL('../locales/es.json', import.meta.url).href
};

const languageMeta = {
  en: { label: 'EN — English', locale: 'en', native: 'English', flag: '🇬🇧' },
  sv: { label: 'SE — Svenska', locale: 'sv', native: 'Svenska', flag: '🇸🇪' },
  de: { label: 'DE — Deutsch', locale: 'de', native: 'Deutsch', flag: '🇩🇪' },
  es: { label: 'ES — Español', locale: 'es', native: 'Español', flag: '🇪🇸' }
};

const languageKey = 'helpro.locale';
const redirectKey = 'helpro.postLangRedirect';
const supportedLanguages = Object.keys(localeFiles);
let translations = {};
let fallbackTranslations = {};
let currentLanguage = 'en';
const listeners = new Set();
let selectorEl = null;
let lastFocused = null;

async function loadLocale(lang) {
  const path = localeFiles[lang] || localeFiles.en;
  try {
    const res = await fetch(path);
    if (!res.ok) throw new Error('Failed to load locale');
    return await res.json();
  } catch (error) {
    console.warn('Locale load error', error);
    return {};
  }
}

function t(key, fallback = '') {
  if (Object.prototype.hasOwnProperty.call(translations, key)) return translations[key];
  if (Object.prototype.hasOwnProperty.call(fallbackTranslations, key)) return fallbackTranslations[key];
  if (fallback) return fallback;
  return key;
}

function formatWithLocale(date, lang = currentLanguage, options = {}) {
  const locale = languageMeta[lang]?.locale || languageMeta.en.locale;
  return new Intl.DateTimeFormat(locale, options).format(date);
}

function getStoredLanguage() {
  try {
    const stored = localStorage.getItem(languageKey);
    if (!stored) return null;
    if (!localeFiles[stored]) {
      localStorage.removeItem(languageKey);
      return null;
    }
    return stored;
  } catch (error) {
    console.warn('Language read failed', error);
    return null;
  }
}

function isValidLanguage(lang) {
  return supportedLanguages.includes(lang);
}

async function setLanguage(lang, persist = true) {
  const target = localeFiles[lang] ? lang : 'en';
  const loaded = await loadLocale(target);
  translations = loaded && Object.keys(loaded).length ? loaded : {};
  currentLanguage = target;
  if (!Object.keys(fallbackTranslations).length || !fallbackTranslations['app.brand']) {
    const english = await loadLocale('en');
    fallbackTranslations = english || {};
  }
  if (!Object.keys(translations).length) {
    translations = fallbackTranslations;
  }
  if (persist) {
    localStorage.setItem(languageKey, target);
  }
  document.documentElement.lang = languageMeta[target]?.locale || 'en';
  document.documentElement.dir = 'ltr';
  document.documentElement.removeAttribute('data-lang-pending');
  document.body.classList.remove('lang-blocked');
  document.documentElement.classList.remove('language-selector-open');
  applyTranslations();
  listeners.forEach((cb) => cb(target));
  closeSelector();
  document.body.classList.remove('lang-blocked');

  const pendingRedirect = sessionStorage.getItem(redirectKey);
  if (pendingRedirect) {
    sessionStorage.removeItem(redirectKey);
    location.replace(pendingRedirect);
  }
}

async function initI18n() {
  const stored = getStoredLanguage();
  if (!stored || !isValidLanguage(stored)) {
    const page = document.body?.dataset?.page;
    const fallbackMain = '/index.html';
    const isAuthIntent = ['login', 'register', 'auth', 'verify'].includes(page);
    const intended = isAuthIntent ? window.location.pathname : fallbackMain;
    sessionStorage.setItem(redirectKey, intended || fallbackMain);
    document.documentElement.dataset.langPending = 'true';
    document.body.classList.add('lang-blocked');
    openLanguageSelector({ required: true });
    await new Promise((resolve) => {
      const off = onLanguageChange(() => {
        off();
        resolve();
      });
    });
  } else {
    await setLanguage(stored || 'en', Boolean(stored));
  }
  document.documentElement.removeAttribute('data-lang-pending');
  document.body.classList.remove('lang-blocked');
}

function applyTranslations(scope = document) {
  scope.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.dataset.i18n;
    const fallback = el.dataset.i18nFallback || el.textContent?.trim() || '';
    const html = el.dataset.i18nHtml === 'true';
    const value = t(key, fallback);
    if (html) el.innerHTML = value;
    else el.textContent = value;
  });

  scope.querySelectorAll('[data-i18n-attr]').forEach((el) => {
    const attr = el.dataset.i18nAttr;
    const key = el.dataset.i18nKey || el.dataset.i18n || '';
    const fallback = el.getAttribute(attr) || '';
    const value = t(key, fallback);
    if (attr) el.setAttribute(attr, value);
  });
}

function onLanguageChange(cb) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function buildLanguageOption({ code, label }) {
  const meta = languageMeta[code] || {};
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'language-option';
  const subtitle = meta.native ? `${meta.native} · ${meta.locale || ''}` : meta.locale || 'Interface';
  button.innerHTML = `
    <span class="tile-left" aria-hidden="true">${meta.flag || '🌐'}</span>
    <span class="tile-body">
      <span class="tile-title">${label}</span>
      <span class="tile-subtitle">${subtitle}</span>
    </span>
    <span class="tile-check" aria-hidden="true"></span>
  `;
  button.dataset.lang = code;
  if (code === currentLanguage) {
    button.classList.add('active');
    button.setAttribute('aria-pressed', 'true');
  } else {
    button.setAttribute('aria-pressed', 'false');
  }
  button.addEventListener('click', async () => {
    document.querySelectorAll('.language-option').forEach((el) => {
      el.classList.toggle('active', el === button);
      el.setAttribute('aria-pressed', el === button ? 'true' : 'false');
    });
    await setLanguage(code);
  });
  return button;
}

function trapFocus(modal, { allowEscape = true } = {}) {
  const focusable = modal.querySelectorAll('button');
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  modal.addEventListener('keydown', (event) => {
    if (event.key === 'Tab') {
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    if (event.key === 'Escape') {
      if (allowEscape) closeSelector();
    }
  });
  return first;
}

function openLanguageSelector({ required = false } = {}) {
  if (selectorEl) {
    selectorEl.dataset.required = required ? 'true' : 'false';
    selectorEl.querySelector('.language-dismiss')?.classList.toggle('hidden', required);
    selectorEl.classList.remove('hidden');
    selectorEl.setAttribute('aria-hidden', 'false');
    selectorEl.querySelector('button')?.focus();
    return;
  }
  selectorEl = document.createElement('div');
  selectorEl.className = 'language-backdrop';
  selectorEl.setAttribute('role', 'dialog');
  selectorEl.setAttribute('aria-modal', 'true');
  selectorEl.setAttribute('aria-label', 'Language selector');
  selectorEl.dataset.required = required ? 'true' : 'false';

  const dialog = document.createElement('div');
  dialog.className = 'language-dialog';

  const title = document.createElement('p');
  title.className = 'language-title';
  title.setAttribute('data-i18n', 'language.title');
  title.textContent = t('language.title', 'Choose your language');

  const subtitle = document.createElement('p');
  subtitle.className = 'language-subtitle';
  subtitle.setAttribute('data-i18n', 'language.subtitle');
  subtitle.textContent = t('language.subtitle', 'Your choice will update the UI and chat replies.');

  const grid = document.createElement('div');
  grid.className = 'language-grid';
  Object.entries(languageMeta).forEach(([code, meta]) => {
    grid.appendChild(buildLanguageOption({ code, label: meta.label }));
  });

  const dismiss = document.createElement('button');
  dismiss.type = 'button';
  dismiss.className = 'language-dismiss';
  dismiss.setAttribute('data-i18n', 'language.dismiss');
  dismiss.textContent = t('language.dismiss', 'Continue with English');
  dismiss.addEventListener('click', () => closeSelector());
  if (required) dismiss.classList.add('hidden');

  dialog.appendChild(title);
  dialog.appendChild(subtitle);
  dialog.appendChild(grid);
  dialog.appendChild(dismiss);
  selectorEl.appendChild(dialog);
  document.body.appendChild(selectorEl);
  applyTranslations(dialog);
  lastFocused = document.activeElement;
  document.documentElement.classList.add('language-selector-open');
  const first = trapFocus(dialog, { allowEscape: !required });
  setTimeout(() => first?.focus(), 0);
}

function closeSelector() {
  if (!selectorEl) return;
  selectorEl.classList.add('hidden');
  selectorEl.setAttribute('aria-hidden', 'true');
  if (lastFocused) lastFocused.focus();
  setTimeout(() => {
    selectorEl?.remove();
    selectorEl = null;
    document.documentElement.classList.remove('language-selector-open');
  }, 50);
}

function getCurrentLanguage() {
  return currentLanguage;
}

export {
  initI18n,
  applyTranslations,
  t,
  onLanguageChange,
  setLanguage,
  openLanguageSelector,
  getCurrentLanguage,
  formatWithLocale,
  languageMeta
};
