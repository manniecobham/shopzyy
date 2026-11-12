
import { tripSummary, type Lang } from './messages';

export interface TripPurchase { id: string; purchasedAtMs: number; itemID: string | null; startsTrip?: boolean }

export const TRIP_MAX_GAP_MS = 60 * 60 * 1000;
export const TRIP_QUIET_PERIOD_MS = 5 * 60 * 1000;

export interface Trip {
  householdID: string;
  buyerKey: string;
  purchases: TripPurchase[];
  startMs: number;
  endMs: number;
  id: string;
}

const tripID = (householdID: string, buyerKey: string, startMs: number) => `${householdID}.${buyerKey}.${Math.trunc(startMs / 1000)}`;

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
    if (last && (p.startsTrip || p.purchasedAtMs - last.purchasedAtMs > TRIP_MAX_GAP_MS)) flush();
    current.push(p);
  }
  flush();
  return trips;
}

export const tripContaining = (trips: Trip[], purchaseID: string): Trip | undefined => trips.find((t) => t.purchases.some((p) => p.id === purchaseID));

export function totalMatchesTrip(total: { tripKey: string; enteredBy: string | null; tripEndedAtMs: number }, trip: Trip): boolean {
  if (total.tripKey === trip.id) return true;
  return total.enteredBy === trip.buyerKey && total.tripEndedAtMs >= trip.startMs - 1000 && total.tripEndedAtMs <= trip.endMs + TRIP_MAX_GAP_MS;
}

export function tripBody(names: string[], maxNames = 3, total: string | null = null, lang: Lang = 'en'): string {
  return tripSummary(names, maxNames, total, lang);
}
