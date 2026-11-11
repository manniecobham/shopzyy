// Pure trip logic for the push alerts: a deliberate copy of the app's ShoppingTrip rules
// (src/logic/ShoppingTrip.ts, tripTotals.ts), kept dependency-free so it is unit-tested from the
// app's Jest suite. If one changes, change the other.

export interface TripPurchase { id: string; purchasedAtMs: number; itemID: string | null }

export const TRIP_MAX_GAP_MS = 60 * 60 * 1000;
/** A trip must be quiet this long before it's announced to the other members. */
export const TRIP_QUIET_PERIOD_MS = 5 * 60 * 1000;

export interface Trip {
  householdID: string;
  buyerKey: string;
  purchases: TripPurchase[];
  startMs: number;
  endMs: number;
  /** Same id the app computes, so a later update replaces the earlier notification. */
  id: string;
}

const tripID = (householdID: string, buyerKey: string, startMs: number) => `${householdID}.${buyerKey}.${Math.trunc(startMs / 1000)}`;

/** Splits one buyer's purchases into trips: a pause longer than TRIP_MAX_GAP_MS starts another. */
export function groupTrips(householdID: string, buyerKey: string, purchases: TripPurchase[]): Trip[] {
  const sorted = [...purchases].sort((a, b) => a.purchasedAtMs - b.purchasedAtMs);
  const trips: Trip[] = [];
  let current: TripPurchase[] = [];
  const flush = () => {
    if (current.length === 0) return;
    const startMs = current[0].purchasedAtMs;
    trips.push({ householdID, buyerKey, purchases: current, startMs, endMs: current[current.length - 1].purchasedAtMs, id: tripID(householdID, buyerKey, startMs) });
    current = [];
  };
  for (const p of sorted) {
    const last = current[current.length - 1];
    if (last && p.purchasedAtMs - last.purchasedAtMs > TRIP_MAX_GAP_MS) flush();
    current.push(p);
  }
  flush();
  return trips;
}

/** The trip a purchase belongs to. */
export const tripContaining = (trips: Trip[], purchaseID: string): Trip | undefined => trips.find((t) => t.purchases.some((p) => p.id === purchaseID));

/** Whether `total` belongs to `trip` (the app's TripTotal.matches). */
export function totalMatchesTrip(total: { tripKey: string; enteredBy: string | null; tripEndedAtMs: number }, trip: Trip): boolean {
  if (total.tripKey === trip.id) return true;
  return total.enteredBy === trip.buyerKey && total.tripEndedAtMs >= trip.startMs - 1000 && total.tripEndedAtMs <= trip.endMs + TRIP_MAX_GAP_MS;
}

/** "6 items · Milk, Eggs, Bread and 3 more", with the total after it when known. */
export function tripBody(names: string[], maxNames = 3, total: string | null = null): string {
  const count = names.length === 1 ? '1 item' : `${names.length} items`;
  const shown = names.slice(0, maxNames).join(', ');
  const rest = names.length - Math.min(names.length, maxNames);
  const summary = rest > 0 ? `${count} · ${shown} and ${rest} more` : `${count} · ${shown}`;
  return total ? `${summary} · ${total}` : summary;
}
