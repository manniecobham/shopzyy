import type { TripTotal } from '../models/entities';
import { TRIP_MAX_GAP_MS, type ShoppingTrip } from './ShoppingTrip';

/**
 * Whether `total` is the total for `trip`. Compares the trip id first; the fallback covers a
 * trip another device saw slightly differently (e.g. its first tick-off fell outside that
 * device's look-back window).
 */
export function totalMatchesTrip(total: TripTotal, trip: ShoppingTrip): boolean {
  if (total.tripKey === trip.id) return true;
  return total.householdID === trip.householdID
    && total.enteredBy === trip.buyerKey
    && total.tripEndedAt.getTime() >= trip.start.getTime() - 1000
    && total.tripEndedAt.getTime() <= trip.end.getTime() + TRIP_MAX_GAP_MS;
}

/** Trip id plus how many items it has, so ticking off more items after a skip counts as a new moment to ask. */
export const tripSkipKey = (trip: ShoppingTrip): string => `${trip.id}#${trip.purchases.length}`;
