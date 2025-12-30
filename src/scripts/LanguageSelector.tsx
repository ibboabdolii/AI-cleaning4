import { useEffect, useState } from 'react';
import { setLanguage, getCurrentLanguage } from './i18n.js';

export function LanguageSelector() {
  const [open, setOpen] = useState(!localStorage.getItem('lang'));
  const [lang, setLang] = useState(getCurrentLanguage());

  useEffect(() => {
    if (lang) setLanguage(lang);
    if (localStorage.getItem('lang')) setOpen(false);
  }, [lang]);

  if (!open) return null;

  const options = [
    { code: 'en', label: 'English', subtitle: 'English · en-US', flag: '🇬🇧' },
    { code: 'de', label: 'Deutsch', subtitle: 'Deutsch · de-DE', flag: '🇩🇪' },
    { code: 'se', label: 'Svenska', subtitle: 'Svenska · sv-SE', flag: '🇸🇪' },
    { code: 'es', label: 'Español', subtitle: 'Español · es-ES', flag: '🇪🇸' }
  ];

  const choose = (value: string) => {
    localStorage.setItem('lang', value);
    setLang(value as any);
    setOpen(false);
    window.location.href = '/index.html';
  };

  return (
    <div className="language-backdrop" role="dialog" aria-modal="true" aria-label="Language selector">
      <div className="language-dialog">
        <p className="language-title">Choose your language</p>
        <div className="language-grid">
          {options.map((option) => (
            <button
              key={option.code}
              className={`language-option ${lang === option.code ? 'active' : ''}`}
              onClick={() => choose(option.code)}
              aria-pressed={lang === option.code}
            >
              <span className="tile-left" aria-hidden="true">{option.flag}</span>
              <span className="tile-body">
                <span className="tile-title">{option.label}</span>
                <span className="tile-subtitle">{option.subtitle}</span>
              </span>
              <span className="tile-check" aria-hidden="true" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
