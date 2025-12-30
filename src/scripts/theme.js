const themeKey = 'theme';
const allowedThemes = ['light', 'dark'];

function getPreferredTheme() {
  try {
    const saved = localStorage.getItem(themeKey);
    if (allowedThemes.includes(saved)) return saved;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'light';
  } catch (error) {
    console.warn('Theme read failed', error);
    return 'light';
  }
}

function syncColorScheme(theme) {
  document.documentElement.style.colorScheme = theme === 'dark' ? 'dark' : 'light';
}

function applyTheme(theme, persist = true) {
  const next = allowedThemes.includes(theme) ? theme : 'light';
  document.documentElement.dataset.theme = next;
  syncColorScheme(next);
  if (persist) {
    try {
      localStorage.setItem(themeKey, next);
    } catch (error) {
      console.warn('Theme persist failed', error);
    }
  }
  updateToggleLabels(next);
  return next;
}

function initTheme() {
  const initial = document.documentElement.dataset.theme || getPreferredTheme();
  applyTheme(initial, false);
  document.documentElement.classList.add('theme-ready');
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  media.addEventListener('change', (event) => {
    const stored = localStorage.getItem(themeKey);
    if (allowedThemes.includes(stored)) return;
    applyTheme(event.matches ? 'dark' : 'light', false);
  });
}

function toggleTheme() {
  const current = document.documentElement.dataset.theme || getPreferredTheme();
  const next = current === 'dark' ? 'light' : 'dark';
  applyTheme(next);
}

function updateToggleLabels(theme) {
  const toggles = document.querySelectorAll('[data-theme-toggle]');
  toggles.forEach((btn) => {
    const icon = btn.querySelector('.theme-toggle__icon');
    const label = btn.querySelector('.theme-toggle__label');
    btn.setAttribute('aria-pressed', theme === 'dark');
    if (icon) icon.textContent = theme === 'dark' ? '🌙' : '☀️';
    if (label) label.textContent = theme === 'dark' ? 'Dark' : 'Light';
  });
}

function bindThemeToggle() {
  const toggles = document.querySelectorAll('[data-theme-toggle]');
  toggles.forEach((btn) => {
    if (btn.dataset.bound) return;
    btn.addEventListener('click', () => toggleTheme());
    btn.dataset.bound = 'true';
  });
  updateToggleLabels(document.documentElement.dataset.theme || getPreferredTheme());
}

export { applyTheme, bindThemeToggle, getPreferredTheme, initTheme, toggleTheme };
