/**
 * "2 hours ago", "yesterday", "in 3 days": SwiftUI's `.relative(presentation: .named)` style.
 */
export function relativeTime(date: Date, now: Date = new Date()): string {
  const diff = (date.getTime() - now.getTime()) / 1000; // seconds, negative = past
  const abs = Math.abs(diff);
  const past = diff < 0;
  const wrap = (n: number, unit: string) => {
    const label = `${n} ${unit}${n === 1 ? '' : 's'}`;
    return past ? `${label} ago` : `in ${label}`;
  };
  if (abs < 45) return 'now';
  if (abs < 90 * 60) return wrap(Math.max(1, Math.round(abs / 60)), 'minute');
  if (abs < 22 * 3600) return wrap(Math.round(abs / 3600), 'hour');

  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOf(date) - startOf(now)) / 86_400_000);
  if (days === 0) return wrap(Math.max(1, Math.round(abs / 3600)), 'hour');
  if (days === -1) return 'yesterday';
  if (days === 1) return 'tomorrow';
  const n = Math.abs(days);
  if (n < 14) return wrap(n, 'day');
  if (n < 60) return wrap(Math.round(n / 7), 'week');
  if (n < 365) return wrap(Math.round(n / 30), 'month');
  return wrap(Math.round(n / 365), 'year');
}

/** Formats an amount in an ISO 4217 currency, e.g. "€42.50". Falls back to "42.50 EUR". */
export function formatCurrency(amount: number, code: string): string {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: code }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${code}`;
  }
}

/** The narrow symbol for a currency ("€", "$", "£"), or the code when unknown. */
export function currencySymbol(code: string): string {
  try {
    const parts = new Intl.NumberFormat(undefined, { style: 'currency', currency: code, currencyDisplay: 'narrowSymbol', maximumFractionDigits: 0 }).formatToParts(0);
    return parts.find((p) => p.type === 'currency')?.value ?? code;
  } catch {
    return code;
  }
}

/** The device region's currency, used until a household picks one (Swift: Locale.current.currency). */
export function deviceCurrency(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getLocales } = require('expo-localization') as typeof import('expo-localization');
    return getLocales()[0]?.currencyCode ?? 'USD';
  } catch {
    return 'USD';
  }
}

/** A household's currency for new totals: its choice, else the device's region. */
export const householdCurrency = (currencyCode: string): string => (currencyCode === '' ? deviceCurrency() : currencyCode);
