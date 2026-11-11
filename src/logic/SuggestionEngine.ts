import { t } from '../i18n';
import { DayPhrase } from './DayPhrase';

const tx = (s: string) => s;

export interface PurchaseHistory {
  itemID: string;
  name: string;
  purchaseDates: Date[];
  isOnList?: boolean;
  snoozedUntil?: Date | null;
}

export type SuggestionKind = 'overdue' | 'dueSoon' | 'longTimeNoSee';
const KIND_RANK: Record<SuggestionKind, number> = { overdue: 0, dueSoon: 1, longTimeNoSee: 2 };
export const KIND_TITLE: Record<SuggestionKind, string> = {
  overdue: tx('Probably running out'),
  dueSoon: tx('Due about now'),
  longTimeNoSee: tx('Not bought in a while'),
};
export const KIND_EXPLANATION: Record<SuggestionKind, string> = {
  overdue: tx("You'd normally have bought these again by now."),
  dueSoon: tx('Based on how often your household buys them.'),
  longTimeNoSee: tx('Things you used to buy. Snooze any you no longer need.'),
};

export interface Suggestion {
  itemID: string;
  name: string;
  kind: SuggestionKind;
  /** Relative urgency within a kind; higher is more urgent. */
  score: number;
  daysSinceLastPurchase: number;
  typicalIntervalDays: number | null;
}

export function suggestionReason(s: Suggestion): string {
  const since = t('last bought {when}', { when: DayPhrase.ago(s.daysSinceLastPurchase) });
  if (s.typicalIntervalDays !== null && s.kind !== 'longTimeNoSee') {
    return t('Usually bought {cadence}, {since}', { cadence: DayPhrase.cadence(s.typicalIntervalDays), since });
  }
  return t("Haven't bought this in {span}", { span: DayPhrase.span(s.daysSinceLastPurchase) });
}

export function suggestionShortReason(s: Suggestion): string {
  switch (s.kind) {
    case 'overdue': return t('Overdue');
    case 'dueSoon': return t('Due now');
    case 'longTimeNoSee': return t('{span} ago', { span: DayPhrase.span(s.daysSinceLastPurchase) });
  }
}

export interface RestockForecast {
  itemID: string;
  name: string;
  expectedDate: Date;
  typicalIntervalDays: number;
}

export interface PurchasePattern {
  lastPurchase: Date;
  /** Distinct days with a purchase (several purchases on one day count once). */
  purchaseDays: number;
  /** null until there is enough history to call it a habit. */
  expectedIntervalDays: number | null;
  /** 0…1. 1 means perfectly regular; derived from the coefficient of variation. */
  regularity: number;
}

export interface EngineConfiguration {
  minimumIntervals: number;
  dueSoonRatio: number;
  overdueRatio: number;
  abandonedRatio: number;
  longTimeNoSeeDays: number;
  horizonDays: number;
  recencyWeight: number;
  maxResults: number;
}

const DEFAULTS: EngineConfiguration = {
  minimumIntervals: 2,
  dueSoonRatio: 0.85,
  overdueRatio: 1.4,
  abandonedRatio: 4.0,
  longTimeNoSeeDays: 30,
  horizonDays: 365,
  recencyWeight: 0.4,
  maxResults: 20,
};

const DAY_MS = 86_400_000;
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
/** Whole calendar days between two dates (DST-safe). */
const daysBetween = (a: Date, b: Date) => Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / DAY_MS);
const addDays = (d: Date, n: number) => {
  const r = new Date(d.getTime());
  r.setDate(r.getDate() + n);
  return r;
};

export function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/**
 * Learns each item's buying rhythm and decides what to suggest. Uses the device's local
 * calendar (Swift's `Calendar.current`); tests pin the time zone.
 *
 * For items with a habit (≥ 2 gaps): expected gap = mean of the median gap and an
 * exponentially weighted gap; urgency = days since last ÷ expected gap; score is damped by
 * irregularity and thin history. Items far past their rhythm, or bought too rarely to have
 * one, become gentle "not bought in a while" nudges.
 */
export class SuggestionEngine {
  readonly configuration: EngineConfiguration;

  constructor(configuration: Partial<EngineConfiguration> = {}) {
    this.configuration = { ...DEFAULTS, ...configuration };
  }

  suggestions(histories: PurchaseHistory[], now: Date = new Date()): Suggestion[] {
    return histories
      .filter((h) => this.isEligible(h, now))
      .map((h) => this.suggestion(h, now))
      .filter((s): s is Suggestion => s !== null)
      .sort((l, r) => {
        if (l.kind !== r.kind) return KIND_RANK[l.kind] - KIND_RANK[r.kind];
        if (l.score !== r.score) return r.score - l.score;
        return l.name < r.name ? -1 : l.name > r.name ? 1 : 0;
      })
      .slice(0, this.configuration.maxResults);
  }

  /** When each habitual item is next expected to run out, for scheduling reminders. */
  forecasts(histories: PurchaseHistory[], now: Date = new Date()): RestockForecast[] {
    const today = startOfDay(now);
    const out: RestockForecast[] = [];
    for (const h of histories) {
      if (h.isOnList) continue;
      const pattern = this.pattern(h.purchaseDates);
      if (!pattern || pattern.expectedIntervalDays === null) continue;
      const interval = pattern.expectedIntervalDays;
      const since = daysBetween(pattern.lastPurchase, now);
      if (!(since < interval * this.configuration.abandonedRatio)) continue;

      const expected = addDays(pattern.lastPurchase, Math.round(interval));
      const snooze = h.snoozedUntil ? startOfDay(h.snoozedUntil) : null;
      const date = snooze && snooze > expected ? snooze : expected;
      if (date < today) continue;
      out.push({ itemID: h.itemID, name: h.name, expectedDate: date, typicalIntervalDays: Math.round(interval) });
    }
    return out.sort((a, b) => a.expectedDate.getTime() - b.expectedDate.getTime());
  }

  pattern(dates: Date[]): PurchasePattern | null {
    const days = [...new Set(dates.map((d) => startOfDay(d).getTime()))].sort((a, b) => a - b).map((t) => new Date(t));
    if (days.length === 0) return null;
    const last = days[days.length - 1];

    const intervals: number[] = [];
    for (let i = 1; i < days.length; i++) {
      const gap = daysBetween(days[i - 1], days[i]);
      if (gap > 0) intervals.push(gap);
    }

    if (intervals.length < this.configuration.minimumIntervals) {
      return { lastPurchase: last, purchaseDays: days.length, expectedIntervalDays: null, regularity: 0 };
    }

    const alpha = this.configuration.recencyWeight;
    const recencyWeighted = intervals.slice(1).reduce((acc, v) => alpha * v + (1 - alpha) * acc, intervals[0]);
    const expected = Math.max(1, (median(intervals) + recencyWeighted) / 2);

    const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance = intervals.reduce((a, v) => a + (v - mean) * (v - mean), 0) / intervals.length;
    const cv = mean > 0 ? Math.sqrt(variance) / mean : 0;

    return { lastPurchase: last, purchaseDays: days.length, expectedIntervalDays: expected, regularity: 1 / (1 + cv) };
  }

  private isEligible(h: PurchaseHistory, now: Date): boolean {
    if (h.isOnList || h.purchaseDates.length === 0) return false;
    if (h.snoozedUntil && h.snoozedUntil > now) return false;
    return true;
  }

  private suggestion(h: PurchaseHistory, now: Date): Suggestion | null {
    const pattern = this.pattern(h.purchaseDates);
    if (!pattern) return null;
    const since = daysBetween(pattern.lastPurchase, now);
    const c = this.configuration;

    const interval = pattern.expectedIntervalDays;
    if (interval === null) return this.longTimeNoSee(h, pattern, since);

    const ratio = since / interval;
    if (ratio >= c.abandonedRatio && since >= c.longTimeNoSeeDays) return this.longTimeNoSee(h, pattern, since);
    if (ratio < c.dueSoonRatio) return null;

    const confidence = 0.6 + 0.4 * Math.min(1, (pattern.purchaseDays - 1) / 5);
    const score = Math.min(ratio, 2.5) * (0.5 + 0.5 * pattern.regularity) * confidence;
    return {
      itemID: h.itemID,
      name: h.name,
      kind: ratio >= c.overdueRatio ? 'overdue' : 'dueSoon',
      score,
      daysSinceLastPurchase: since,
      typicalIntervalDays: Math.round(interval),
    };
  }

  private longTimeNoSee(h: PurchaseHistory, pattern: PurchasePattern, daysSince: number): Suggestion | null {
    const c = this.configuration;
    if (daysSince < c.longTimeNoSeeDays || daysSince > c.horizonDays) return null;
    const familiarity = Math.min(pattern.purchaseDays, 5) / 5;
    const freshness = 1 - (daysSince / c.horizonDays) * 0.5;
    return {
      itemID: h.itemID,
      name: h.name,
      kind: 'longTimeNoSee',
      score: 0.3 * (0.5 + 0.5 * familiarity) * freshness,
      daysSinceLastPurchase: daysSince,
      typicalIntervalDays: null,
    };
  }
}
