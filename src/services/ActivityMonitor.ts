import { ShoppingTrip } from '../logic/ShoppingTrip';
import { totalMatchesTrip } from '../logic/tripTotals';
import { formatCurrency } from '../lib/format';
import { purchaseItemName, purchaseMemberName } from '../models/itemOps';
import { StorageKeys } from './storageKeys';
import type { ServiceEnv } from './ports';

/** Added to a trip's purchase count in `announcedTrips` once its total is in the summary. */
const TOTAL_MARKER = 100_000;
const LOOKBACK_MS = 24 * 60 * 60 * 1000;

interface PrefsLike {
  getJSON<T>(key: string): T | null;
  setJSON(key: string, value: unknown): void;
}

/**
 * Tells people when someone else in their household went shopping. Rather than one alert per
 * item, purchases from other devices are grouped into shopping trips; each trip gets a single
 * notification, delivered once the buyer has stopped ticking items off for a while. If more
 * purchases arrive later, the notification is replaced with the updated summary.
 *
 * Runs when the app becomes active and whenever the sync applies changes from the server. Only
 * recent purchases count, so the first sync on a new phone doesn't replay history.
 */
export function scanForRemotePurchases(env: ServiceEnv, prefs: PrefsLike, now: Date = new Date()): void {
  const cutoff = now.getTime() - LOOKBACK_MS;
  const recent = env.store.allPurchases().filter((p) => p.purchasedAt.getTime() > cutoff && p.originDeviceID !== env.prefs.deviceID);

  const households = env.store.allHouseholds();
  const names = new Map(households.map((h) => [h.id, h.name === '' ? 'Shared household' : h.name]));
  const showsHousehold = households.length > 1;

  const trips = ShoppingTrip.group(recent.map((r) => ({
    householdID: r.householdID, buyerKey: r.member?.userRecordName ?? null, buyerName: purchaseMemberName(r),
    purchase: { id: r.id, itemName: purchaseItemName(r), purchasedAt: r.purchasedAt },
  })));
  const totals = env.store.allTripTotals();

  // Trip id → what was already announced (purchase count, plus a marker once the total is included),
  // so an unchanged trip isn't announced again on every scan, but is refreshed when its total arrives.
  const announced = prefs.getJSON<Record<string, number>>(StorageKeys.announcedTrips) ?? {};
  for (const trip of trips) {
    const total = totals.find((t) => totalMatchesTrip(t, trip)) ?? null;
    const signature = trip.purchases.length + (total ? TOTAL_MARKER : 0);
    if (announced[trip.id] === signature) continue;
    void env.notifier.postShoppingTrip(
      trip, showsHousehold ? names.get(trip.householdID) ?? null : null, total ? formatCurrency(total.amount, total.currencyCode) : null, now,
    );
    announced[trip.id] = signature;
  }

  // Only trips inside the lookback window can change, so forget the rest.
  const live = new Set(trips.map((t) => t.id));
  prefs.setJSON(StorageKeys.announcedTrips, Object.fromEntries(Object.entries(announced).filter(([k]) => live.has(k))));
}
