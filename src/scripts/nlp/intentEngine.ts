import enCatalog from './intents/en.json';
import seCatalog from './intents/se.json';
import deCatalog from './intents/de.json';
import esCatalog from './intents/es.json';

export type SupportedLanguage = 'en' | 'se' | 'de' | 'es';
export type DetectedIntent = {
  intent: string;
  match: string;
  language: SupportedLanguage;
};

type Catalog = Record<string, string>;

const catalogs: Record<SupportedLanguage, Catalog> = {
  en: enCatalog as Catalog,
  se: seCatalog as Catalog,
  de: deCatalog as Catalog,
  es: esCatalog as Catalog
};

const normalize = (value: string) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim();

function evaluateCatalog(message: string, catalog: Catalog, language: SupportedLanguage): DetectedIntent | null {
  const normalizedMessage = normalize(message);

  for (const [phrase, intent] of Object.entries(catalog)) {
    const normalizedPhrase = normalize(phrase);
    if (!normalizedPhrase) continue;

    if (normalizedMessage.includes(normalizedPhrase) || normalizedPhrase.includes(normalizedMessage)) {
      return { intent, match: phrase, language };
    }

    const words = normalizedPhrase.split(/\s+/).filter(Boolean);
    if (words.length && words.every((word) => normalizedMessage.includes(word))) {
      return { intent, match: phrase, language };
    }
  }

  return null;
}

export function detectIntent(message: string, language: SupportedLanguage = 'en'): DetectedIntent | null {
  const primary = catalogs[language] ? (language as SupportedLanguage) : 'en';
  const primaryResult = evaluateCatalog(message, catalogs[primary], primary);
  if (primaryResult) return primaryResult;

  if (primary !== 'en') {
    const fallbackResult = evaluateCatalog(message, catalogs.en, 'en');
    if (fallbackResult) return fallbackResult;
  }

  return null;
}
