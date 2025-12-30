import { bindThemeToggle, initTheme } from './theme.js';
import { applyTranslations, languageMeta, setLanguage } from './i18n.js';

const languages = ['de', 'sv', 'es', 'en'];
const redirectKey = 'helpro.postLangRedirect';
const mainEntry = '/book.html';

function renderOptions(container: HTMLElement) {
  container.innerHTML = '';
  languages.forEach((code) => {
    const meta = languageMeta[code as keyof typeof languageMeta];
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.lang = code;
    button.className = 'language-option inline-flex w-full items-center justify-between rounded-2xl border border-white/20 bg-white/70 px-4 py-3 text-left transition hover:-translate-y-0.5 hover:border-emerald-400/60 hover:shadow-lg dark:bg-white/5';
    button.innerHTML = `
      <span class="flex items-center gap-3">
        <span class="text-2xl">${meta?.flag || '🌐'}</span>
        <span>
          <span class="block text-base font-semibold">${meta?.label || code.toUpperCase()}</span>
          <span class="block text-sm text-gray-600 dark:text-gray-300">${meta?.native || meta?.locale || code}</span>
        </span>
      </span>
      <span class="pill">${meta?.locale || code}</span>
    `;
    button.addEventListener('click', async () => {
      document.querySelectorAll('[data-lang]').forEach((el) => el.classList.remove('active'));
      button.classList.add('active');
      await setLanguage(code, true);
      const continueBtn = document.getElementById('continue-language') as HTMLButtonElement | null;
      if (continueBtn) continueBtn.disabled = false;
    });
    container.appendChild(button);
  });
}

async function init() {
  initTheme();
  bindThemeToggle();
  const stored = localStorage.getItem('helpro.locale');
  if (stored && languages.includes(stored)) {
    await setLanguage(stored, false);
    location.replace(mainEntry);
    return;
  }

  const grid = document.getElementById('language-options');
  if (grid) {
    renderOptions(grid);
    applyTranslations(grid as HTMLElement);
  }

  const continueBtn = document.getElementById('continue-language') as HTMLButtonElement | null;
  continueBtn?.addEventListener('click', () => {
    if (!sessionStorage.getItem(redirectKey)) {
      sessionStorage.setItem(redirectKey, mainEntry);
    }
    const active = document.querySelector('[data-lang].active') as HTMLElement | null;
    const chosen = active?.dataset.lang || stored || languages[0];
    setLanguage(chosen, true);
  });
}

document.addEventListener('DOMContentLoaded', init);
