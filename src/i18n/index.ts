import { Platform } from 'react-native';
import de from './locales/de';
import es from './locales/es';
import fr from './locales/fr';
import it from './locales/it';
import nl from './locales/nl';

export const LANGUAGES = ['en', 'es', 'fr', 'nl', 'de', 'it'] as const;
export type Language = (typeof LANGUAGES)[number];

export const LANGUAGE_NAMES: Record<Language, string> = {
  en: 'English', es: 'Español', fr: 'Français', nl: 'Nederlands', de: 'Deutsch', it: 'Italiano',
};

const catalogs: Record<Language, Record<string, string>> = { en: {}, es, fr, nl, de, it };

let override: Language | null = null;
let current: Language = detect();
let tag = 'en';
const listeners = new Set<() => void>();

function systemLocale(): { languageCode: string | null; languageTag: string } | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getLocales } = require('expo-localization') as typeof import('expo-localization');
    return getLocales()[0] ?? null;
  } catch {
    return null;
  }
}

function detect(): Language {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getLocales } = require('expo-localization') as typeof import('expo-localization');
    for (const l of getLocales()) {
      const code = (l.languageCode ?? '').toLowerCase();
      if ((LANGUAGES as readonly string[]).includes(code)) {
        tag = l.languageTag;
        return code as Language;
      }
    }
  } catch {
    // not available (tests): English
  }
  return 'en';
}

export function language(): Language { return override ?? current; }

export function locale(): string {
  const lang = language();
  const sys = systemLocale();
  return sys && sys.languageTag.toLowerCase().startsWith(lang) ? sys.languageTag : lang === 'en' && tag.startsWith('en') ? tag : lang;
}

export function refreshLanguage() {
  const next = detect();
  if (next !== current) { current = next; emit(); }
}

export function setLanguageOverride(lang: Language | null) {
  override = lang;
  emit();
}

export function subscribeLanguage(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; }
function emit() { listeners.forEach((f) => f()); }

export const hasSystemAppLanguage = Platform.OS === 'ios' || (Platform.OS === 'android' && Number(Platform.Version) >= 33);

export type Params = Record<string, string | number>;

export function t(text: string, params?: Params): string {
  const lang = language();
  const raw = (lang === 'en' ? undefined : catalogs[lang][text]) ?? text;
  return params ? raw.replace(/\{(\w+)\}/g, (m, k: string) => (k in params ? String(params[k]) : m)) : raw;
}

export function tn(one: string, other: string, n: number, params?: Params): string {
  return t(n === 1 ? one : other, { n, ...params });
}

export const tx = (text: string): string => text;

export function __setLanguageForTests(lang: Language) { override = lang; }
