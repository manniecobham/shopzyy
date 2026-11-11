import { t, tn } from '../i18n';

export const DayPhrase = {
  span(days: number): string {
    if (days < 14) return tn('{n} day', '{n} days', days);
    if (days < 60) return t('{n} weeks', { n: Math.round(days / 7) });
    const months = Math.round(days / 30);
    return tn('{n} month', '{n} months', months);
  },

  ago(days: number): string {
    if (days <= 0) return t('today');
    if (days === 1) return t('yesterday');
    return t('{span} ago', { span: DayPhrase.span(days) });
  },

  cadence(days: number): string {
    if (days <= 1) return t('daily');
    if (days >= 6 && days <= 8) return t('weekly');
    if (days >= 13 && days <= 16) return t('every 2 weeks');
    if (days >= 27 && days <= 33) return t('monthly');
    if (days < 14) return t('every {n} days', { n: days });
    if (days < 60) return t('every {n} weeks', { n: Math.round(days / 7) });
    return t('every {n} months', { n: Math.round(days / 30) });
  },
};
