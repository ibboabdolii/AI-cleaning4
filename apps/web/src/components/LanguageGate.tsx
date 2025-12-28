import { useState } from 'react';
import { setLanguage } from '../utils/storage';

const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'sv', name: 'Svenska', flag: '🇸🇪' }
];

export function LanguageGate({ onComplete }: { onComplete: (lang: string) => void }) {
  const [remember, setRemember] = useState(false);

  const selectLanguage = (code: string) => {
    setLanguage(code, remember);
    onComplete(code);
  };

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50">
      <div className="bg-gray-900 p-8 rounded-2xl max-w-md w-full mx-4 border border-white/20 shadow-2xl">
        <h2 className="text-3xl font-bold mb-6 text-white text-center">Select Language</h2>
        <div className="grid grid-cols-2 gap-4 mb-6">
          {LANGUAGES.map(lang => (
            <button
              key={lang.code}
              onClick={() => selectLanguage(lang.code)}
              className="p-4 bg-gray-800 hover:bg-gray-700 rounded-xl border border-white/10 
                         transition-all duration-200 flex items-center gap-3 hover:scale-105"
              aria-label={`Select ${lang.name}`}
            >
              <span className="text-3xl">{lang.flag}</span>
              <span className="font-medium text-white text-lg">{lang.name}</span>
            </button>
          ))}
        </div>
        <label className="flex items-center gap-3 text-sm text-gray-300 cursor-pointer hover:text-white transition-colors">
          <input
            type="checkbox"
            checked={remember}
            onChange={e => setRemember(e.target.checked)}
            className="w-4 h-4 rounded border-gray-600 bg-gray-800"
          />
          Remember my choice
        </label>
      </div>
    </div>
  );
}
