import { ShoppingTrip } from '../logic/ShoppingTrip';
import { totalMatchesTrip } from '../logic/tripTotals';
import { formatCurrency } from '../lib/format';
import { purchaseItemName, purchaseMemberName } from '../models/itemOps';
import { StorageKeys } from './storageKeys';
import type { ServiceEnv } from './ports';

const TOTAL_MARKER = 100_000;
const LOOKBACK_MS = 24 * 60 * 60 * 1000;

interface PrefsLike {
  getJSON<T>(key: string): T | null;
  setJSON(key: string, value: unknown): void;
}

export function scanForRemotePurchases(env: ServiceEnv, prefs: PrefsLike, now: Date = new Date(), announce = true): void {
  const cutoff = now.getTime() - LOOKBACK_MS;
  const recent = env.store.allPurchases().filter((p) => p.purchasedAt.getTime() > cutoff && p.originDeviceID !== env.prefs.deviceID);

  const households = env.store.allHouseholds();
  const names = new Map(households.map((h) => [h.id, h.name === '' ? 'Shared household' : h.name]));
  const showsHousehold = households.length > 1;

  const trips = ShoppingTrip.group(recent.map((r) => ({
    householdID: r.householdID, buyerKey: r.member?.userRecordName ?? null, buyerName: purchaseMemberName(r),
    purchase: { id: r.id, itemName: purchaseItemName(r), startsTrip: r.startsTrip, purchasedAt: r.purchasedAt },
  })));
  const totals = env.store.allTripTotals();

  const announced = prefs.getJSON<Record<string, number>>(StorageKeys.announcedTrips) ?? {};
  for (const trip of trips) {
    const total = totals.find((t) => totalMatchesTrip(t, trip)) ?? null;
    const signature = trip.purchases.length + (total ? TOTAL_MARKER : 0);
    if (announced[trip.id] === signature) continue;
    if (announce) {
      void env.notifier.postShoppingTrip(
        trip, showsHousehold ? names.get(trip.householdID) ?? null : null, total ? formatCurrency(total.amount, total.currencyCode) : null, now,
      );
    }
    announced[trip.id] = signature;
  }

  // Only trips inside the lookback window can change, so forget the rest.
  const live = new Set(trips.map((t) => t.id));
  prefs.setJSON(StorageKeys.announcedTrips, Object.fromEntries(Object.entries(announced).filter(([k]) => live.has(k))));
}
