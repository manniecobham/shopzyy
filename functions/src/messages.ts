
export const LANGS = ['en', 'es', 'fr', 'nl', 'de', 'it'] as const;
export type Lang = (typeof LANGS)[number];

export interface Messages {
  wentShopping: string;
  itemOne: string;
  itemOther: string;
  andMore: string;
  someone: string;
  anItem: string;
  sharedHousehold: string;
  memberJoined: string;
  memberCount: string;
}

export const MESSAGES: Record<Lang, Messages> = {
  en: { wentShopping: '{name} went shopping', itemOne: '1 item', itemOther: '{n} items', andMore: '{shown} and {rest} more', someone: 'Someone', anItem: 'an item', sharedHousehold: 'Shared household', memberJoined: '{name} joined {household}', memberCount: 'Your household now has {n} members.' },
  es: { wentShopping: '{name} fue de compras', itemOne: '1 artículo', itemOther: '{n} artículos', andMore: '{shown} y {rest} más', someone: 'Alguien', anItem: 'un artículo', sharedHousehold: 'Hogar compartido', memberJoined: '{name} se unió a {household}', memberCount: 'Tu hogar ya tiene {n} miembros.' },
  fr: { wentShopping: '{name} est allé(e) faire les courses', itemOne: '1 article', itemOther: '{n} articles', andMore: '{shown} et {rest} de plus', someone: 'Quelqu’un', anItem: 'un article', sharedHousehold: 'Foyer partagé', memberJoined: '{name} a rejoint {household}', memberCount: 'Votre foyer compte maintenant {n} membres.' },
  nl: { wentShopping: '{name} is boodschappen gaan doen', itemOne: '1 artikel', itemOther: '{n} artikelen', andMore: '{shown} en nog {rest}', someone: 'Iemand', anItem: 'een artikel', sharedHousehold: 'Gedeeld huishouden', memberJoined: '{name} is toegevoegd aan {household}', memberCount: 'Je huishouden heeft nu {n} leden.' },
  de: { wentShopping: '{name} war einkaufen', itemOne: '1 Artikel', itemOther: '{n} Artikel', andMore: '{shown} und {rest} weitere', someone: 'Jemand', anItem: 'ein Artikel', sharedHousehold: 'Gemeinsamer Haushalt', memberJoined: '{name} ist {household} beigetreten', memberCount: 'Dein Haushalt hat jetzt {n} Mitglieder.' },
  it: { wentShopping: '{name} è andato/a a fare la spesa', itemOne: '1 articolo', itemOther: '{n} articoli', andMore: '{shown} e altri {rest}', someone: 'Qualcuno', anItem: 'un articolo', sharedHousehold: 'Casa condivisa', memberJoined: '{name} si è unito a {household}', memberCount: 'La tua casa ora ha {n} membri.' },
};

export function normalizeLang(raw: unknown): Lang {
  const code = typeof raw === 'string' ? raw.toLowerCase().split(/[-_]/)[0] : '';
  return (LANGS as readonly string[]).includes(code) ? (code as Lang) : 'en';
}

const fill = (text: string, params: Record<string, string | number>) => text.replace(/\{(\w+)\}/g, (m, k: string) => (k in params ? String(params[k]) : m));

export const tripTitle = (name: string, lang: Lang = 'en') => fill(MESSAGES[lang].wentShopping, { name });

export function tripSummary(names: string[], maxNames = 3, total: string | null = null, lang: Lang = 'en'): string {
  const m = MESSAGES[lang];
  const count = names.length === 1 ? m.itemOne : fill(m.itemOther, { n: names.length });
  const shown = names.slice(0, maxNames).join(', ');
  const rest = names.length - Math.min(names.length, maxNames);
  const summary = rest > 0 ? `${count} · ${fill(m.andMore, { shown, rest })}` : `${count} · ${shown}`;
  return total ? `${summary} · ${total}` : summary;
}

// A name typed by the person joining. Trimmed and short, because it ends up in someone else's notification.
export const cleanDisplayName = (raw: unknown): string => String(typeof raw === 'string' ? raw : '').replace(/[\u0000-\u001f\u007f]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 40);

export function joinedAlert(name: string, household: string, count: number, lang: Lang = 'en'): { title: string; body: string } {
  const m = MESSAGES[lang];
  return { title: fill(m.memberJoined, { name: name || m.someone, household: household || m.sharedHousehold }), body: fill(m.memberCount, { n: count }) };
}
