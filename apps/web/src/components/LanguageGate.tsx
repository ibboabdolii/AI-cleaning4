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
      <div className="bg-gray-900 p-8 rounded-lg max-w-md w-full mx-4 border border-white/10">
        <h2 className="text-2xl font-bold mb-6">Select Language</h2>
        <div className="grid grid-cols-2 gap-3 mb-6">
          {LANGUAGES.map(lang => (
            <button
              key={lang.code}
              onClick={() => selectLanguage(lang.code)}
              className="p-4 bg-gray-800 hover:bg-gray-700 rounded border border-white/10 
                         transition-colors flex items-center gap-3"
              aria-label={`Select ${lang.name}`}
            >
              <span className="text-2xl">{lang.flag}</span>
              <span className="font-medium">{lang.name}</span>
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
          <input
            type="checkbox"
            checked={remember}
            onChange={e => setRemember(e.target.checked)}
            className="rounded"
          />
          Remember my choice
        </label>
      </div>
    </div>
  );
}