import type { PurchaseRecord, TripTotal } from '../models/entities';
import { t } from '../i18n';
import { purchaseItemName, purchaseMemberName } from '../models/itemOps';
import { ShoppingTrip } from './ShoppingTrip';
import { totalMatchesTrip } from './tripTotals';

/** One shopping trip as shown in history. */
export interface ActivityTrip {
  id: string;
  trip: ShoppingTrip;
  /** The trip's purchases, newest first. */
  records: PurchaseRecord[];
  total: TripTotal | null;
}

/** Groups purchases into trips, newest trip first, and attaches each trip's total. */
export function groupActivityTrips(records: PurchaseRecord[], totals: TripTotal[], householdID: string): ActivityTrip[] {
  const byID = new Map(records.map((r) => [r.id, r]));
  const trips = ShoppingTrip.group(records.map((r) => ({
    householdID, buyerKey: r.member?.userRecordName ?? null, buyerName: purchaseMemberName(r),
    purchase: { id: r.id, itemName: purchaseItemName(r), purchasedAt: r.purchasedAt },
  })));
  return trips
    .map((trip): ActivityTrip => ({
      id: trip.id,
      trip,
      records: trip.purchases.map((p) => byID.get(p.id)).filter((r): r is PurchaseRecord => !!r).sort((a, b) => b.purchasedAt.getTime() - a.purchasedAt.getTime()),
      total: totals.find((t) => totalMatchesTrip(t, trip)) ?? null,
    }))
    .sort((a, b) => b.trip.end.getTime() - a.trip.end.getTime());
}

export type ActivityPeriod = 'latest' | 'week' | 'month' | 'all';
export const ACTIVITY_PERIODS: ActivityPeriod[] = ['latest', 'week', 'month', 'all'];
export const periodTitle = (p: ActivityPeriod) => ({ latest: t('Latest trips'), week: t('Past week'), month: t('Past month'), all: t('All time') })[p];
/** Trips shown until a wider period is chosen. */
export const LATEST_COUNT = 3;

export function tripsForPeriod(all: ActivityTrip[], period: ActivityPeriod, now = new Date()): ActivityTrip[] {
  const since = (days: number) => { const d = new Date(now.getTime()); d.setDate(d.getDate() - days); return d; };
  switch (period) {
    case 'latest': return all.slice(0, LATEST_COUNT);
    case 'week': return all.filter((t) => t.trip.end >= since(7));
    case 'month': return all.filter((t) => t.trip.end >= since(30));
    case 'all': return all;
  }
}

/** Combined spend of the trips on screen, when they share one currency. */
export function periodSpend(trips: ActivityTrip[]): { amount: number; currency: string } | null {
  const totals = trips.map((t) => t.total).filter((t): t is TripTotal => !!t);
  if (totals.length <= 1) return null;
  const code = totals[0].currencyCode;
  if (!totals.every((t) => t.currencyCode === code)) return null;
  return { amount: totals.reduce((sum, t) => sum + t.amount, 0), currency: code };
}
