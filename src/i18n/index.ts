import { Platform } from 'react-native';
import de from './locales/de';
import es from './locales/es';
import fr from './locales/fr';
import it from './locales/it';
import nl from './locales/nl';

/**
 * Localisation. English text is the key: `t('Delete {name}?', { name })` returns the translation in the
 * active language and falls back to the English text itself, so a missing translation is never blank.
 * The language is the phone's (or the per-app language chosen in system Settings); Android below 13
 * has no per-app setting, so it can be overridden in-app.
 */
export const LANGUAGES = ['en', 'es', 'fr', 'nl', 'de', 'it'] as const;
export type Language = (typeof LANGUAGES)[number];

/** Each language written in itself, for pickers. */
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

/** The first supported language in the phone's preference order, else English. */
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

/** BCP-47 tag for Intl / date formatting: the phone's regional flavour when it matches the language, else the language. */
export function locale(): string {
  const lang = language();
  const sys = systemLocale();
  return sys && sys.languageTag.toLowerCase().startsWith(lang) ? sys.languageTag : lang === 'en' && tag.startsWith('en') ? tag : lang;
}

/** Re-reads the phone's language (after coming back from system Settings) and notifies listeners. */
export function refreshLanguage() {
  const next = detect();
  if (next !== current) { current = next; emit(); }
}

/** In-app override (Android < 13 only); null follows the phone. */
export function setLanguageOverride(lang: Language | null) {
  override = lang;
  emit();
}

export function subscribeLanguage(fn: () => void) { listeners.add(fn); return () => { listeners.delete(fn); }; }
function emit() { listeners.forEach((f) => f()); }

/** Android 13+ and iOS have a per-app language in system Settings; older Android does not. */
export const hasSystemAppLanguage = Platform.OS === 'ios' || (Platform.OS === 'android' && Number(Platform.Version) >= 33);

export type Params = Record<string, string | number>;

export function t(text: string, params?: Params): string {
  const lang = language();
  const raw = (lang === 'en' ? undefined : catalogs[lang][text]) ?? text;
  return params ? raw.replace(/\{(\w+)\}/g, (m, k: string) => (k in params ? String(params[k]) : m)) : raw;
}

/** Picks the singular or plural English text by `n`; both are catalog keys. `{n}` is filled in. */
export function tn(one: string, other: string, n: number, params?: Params): string {
  return t(n === 1 ? one : other, { n, ...params });
}

/** Marks an English string for the catalog without translating it yet (tables resolved with `t()` at lookup time). */
export const tx = (text: string): string => text;

/** Test hook. */
export function __setLanguageForTests(lang: Language) { override = lang; }
