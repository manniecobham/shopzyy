// Push notification text in the six supported languages. Pure and dependency-free so it is unit-tested
// from the app's Jest suite. Each device stores its language beside its push token
// (users/{uid}/devices/{deviceID}.language); anything unknown falls back to English.

export const LANGS = ['en', 'es', 'fr', 'nl', 'de', 'it'] as const;
export type Lang = (typeof LANGS)[number];

export interface Messages {
  /** "{name} went shopping" */
  wentShopping: string;
  itemOne: string;
  /** "{n} items" */
  itemOther: string;
  /** "{shown} and {rest} more" */
  andMore: string;
  someone: string;
  anItem: string;
  sharedHousehold: string;
}

export const MESSAGES: Record<Lang, Messages> = {
  en: { wentShopping: '{name} went shopping', itemOne: '1 item', itemOther: '{n} items', andMore: '{shown} and {rest} more', someone: 'Someone', anItem: 'an item', sharedHousehold: 'Shared household' },
  es: { wentShopping: '{name} fue de compras', itemOne: '1 artículo', itemOther: '{n} artículos', andMore: '{shown} y {rest} más', someone: 'Alguien', anItem: 'un artículo', sharedHousehold: 'Hogar compartido' },
  fr: { wentShopping: '{name} est allé(e) faire les courses', itemOne: '1 article', itemOther: '{n} articles', andMore: '{shown} et {rest} de plus', someone: 'Quelqu’un', anItem: 'un article', sharedHousehold: 'Foyer partagé' },
  nl: { wentShopping: '{name} is boodschappen gaan doen', itemOne: '1 artikel', itemOther: '{n} artikelen', andMore: '{shown} en nog {rest}', someone: 'Iemand', anItem: 'een artikel', sharedHousehold: 'Gedeeld huishouden' },
  de: { wentShopping: '{name} war einkaufen', itemOne: '1 Artikel', itemOther: '{n} Artikel', andMore: '{shown} und {rest} weitere', someone: 'Jemand', anItem: 'ein Artikel', sharedHousehold: 'Gemeinsamer Haushalt' },
  it: { wentShopping: '{name} è andato/a a fare la spesa', itemOne: '1 articolo', itemOther: '{n} articoli', andMore: '{shown} e altri {rest}', someone: 'Qualcuno', anItem: 'un articolo', sharedHousehold: 'Casa condivisa' },
};

/** Normalises a stored language ("fr", "fr-CA", undefined) to a supported one. */
export function normalizeLang(raw: unknown): Lang {
  const code = typeof raw === 'string' ? raw.toLowerCase().split(/[-_]/)[0] : '';
  return (LANGS as readonly string[]).includes(code) ? (code as Lang) : 'en';
}

const fill = (text: string, params: Record<string, string | number>) => text.replace(/\{(\w+)\}/g, (m, k: string) => (k in params ? String(params[k]) : m));

export const tripTitle = (name: string, lang: Lang = 'en') => fill(MESSAGES[lang].wentShopping, { name });

/** "6 items · Milk, Eggs, Bread and 3 more", with the total after it when known. */
export function tripSummary(names: string[], maxNames = 3, total: string | null = null, lang: Lang = 'en'): string {
  const m = MESSAGES[lang];
  const count = names.length === 1 ? m.itemOne : fill(m.itemOther, { n: names.length });
  const shown = names.slice(0, maxNames).join(', ');
  const rest = names.length - Math.min(names.length, maxNames);
  const summary = rest > 0 ? `${count} · ${fill(m.andMore, { shown, rest })}` : `${count} · ${shown}`;
  return total ? `${summary} · ${total}` : summary;
}
