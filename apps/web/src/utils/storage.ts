export const STORAGE_KEYS = {
  LANGUAGE: 'cleanai_language',
  REMEMBER_LANGUAGE: 'cleanai_remember_lang',
  SESSION_ID: 'cleanai_session_id'
} as const;

export function getLanguage(): string | null {
  return localStorage.getItem(STORAGE_KEYS.LANGUAGE) || 
         sessionStorage.getItem(STORAGE_KEYS.LANGUAGE);
}

export function setLanguage(lang: string, remember: boolean) {
  if (remember) {
    localStorage.setItem(STORAGE_KEYS.LANGUAGE, lang);
    localStorage.setItem(STORAGE_KEYS.REMEMBER_LANGUAGE, 'true');
    sessionStorage.removeItem(STORAGE_KEYS.LANGUAGE);
  } else {
    sessionStorage.setItem(STORAGE_KEYS.LANGUAGE, lang);
    localStorage.removeItem(STORAGE_KEYS.LANGUAGE);
    localStorage.removeItem(STORAGE_KEYS.REMEMBER_LANGUAGE);
  }
}

export function shouldShowLanguageGate(): boolean {
  return !getLanguage();
}

export function getSessionId(): string | null {
  const remember = localStorage.getItem(STORAGE_KEYS.REMEMBER_LANGUAGE) === 'true';
  return remember 
    ? localStorage.getItem(STORAGE_KEYS.SESSION_ID)
    : sessionStorage.getItem(STORAGE_KEYS.SESSION_ID);
}

export function setSessionId(id: string, remember: boolean) {
  if (remember) {
    localStorage.setItem(STORAGE_KEYS.SESSION_ID, id);
  } else {
    sessionStorage.setItem(STORAGE_KEYS.SESSION_ID, id);
  }
}
