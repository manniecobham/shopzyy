import { locale, t, tn } from '../i18n';

export function relativeTime(date: Date, now: Date = new Date()): string {
  const diff = (date.getTime() - now.getTime()) / 1000; // seconds, negative = past
  const abs = Math.abs(diff);
  const past = diff < 0;
  const wrap = (n: number, unit: 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year') => {
    switch (unit) {
      case 'minute': return past ? tn('{n} minute ago', '{n} minutes ago', n) : tn('in {n} minute', 'in {n} minutes', n);
      case 'hour': return past ? tn('{n} hour ago', '{n} hours ago', n) : tn('in {n} hour', 'in {n} hours', n);
      case 'day': return past ? tn('{n} day ago', '{n} days ago', n) : tn('in {n} day', 'in {n} days', n);
      case 'week': return past ? tn('{n} week ago', '{n} weeks ago', n) : tn('in {n} week', 'in {n} weeks', n);
      case 'month': return past ? tn('{n} month ago', '{n} months ago', n) : tn('in {n} month', 'in {n} months', n);
      case 'year': return past ? tn('{n} year ago', '{n} years ago', n) : tn('in {n} year', 'in {n} years', n);
    }
  };
  if (abs < 45) return t('now');
  if (abs < 90 * 60) return wrap(Math.max(1, Math.round(abs / 60)), 'minute');
  if (abs < 22 * 3600) return wrap(Math.round(abs / 3600), 'hour');

  const startOf = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const days = Math.round((startOf(date) - startOf(now)) / 86_400_000);
  if (days === 0) return wrap(Math.max(1, Math.round(abs / 3600)), 'hour');
  if (days === -1) return t('yesterday');
  if (days === 1) return t('tomorrow');
  const n = Math.abs(days);
  if (n < 14) return wrap(n, 'day');
  if (n < 60) return wrap(Math.round(n / 7), 'week');
  if (n < 365) return wrap(Math.round(n / 30), 'month');
  return wrap(Math.round(n / 365), 'year');
}

export function formatCurrency(amount: number, code: string): string {
  try {
    return new Intl.NumberFormat(locale(), { style: 'currency', currency: code }).format(amount);
  } catch {
    return `${amount.toFixed(2)} ${code}`;
  }
}

export function currencySymbol(code: string): string {
  try {
    const parts = new Intl.NumberFormat(locale(), { style: 'currency', currency: code, currencyDisplay: 'narrowSymbol', maximumFractionDigits: 0 }).formatToParts(0);
    return parts.find((p) => p.type === 'currency')?.value ?? code;
  } catch {
    return code;
  }
}

export function deviceCurrency(): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { getLocales } = require('expo-localization') as typeof import('expo-localization');
    return getLocales()[0]?.currencyCode ?? 'USD';
  } catch {
    return 'USD';
  }
}

export const householdCurrency = (currencyCode: string): string => (currencyCode === '' ? deviceCurrency() : currencyCode);
