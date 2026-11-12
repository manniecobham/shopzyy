import type { TripTotal } from '../models/entities';
import { TRIP_MAX_GAP_MS, type ShoppingTrip } from './ShoppingTrip';

export function totalMatchesTrip(total: TripTotal, trip: ShoppingTrip): boolean {
  if (total.tripKey === trip.id) return true;
  return total.householdID === trip.householdID
    && total.enteredBy === trip.buyerKey
    && total.tripEndedAt.getTime() >= trip.start.getTime() - 1000
    && total.tripEndedAt.getTime() <= trip.end.getTime() + TRIP_MAX_GAP_MS;
}

export function continuesClosedTrip(trip: ShoppingTrip | null, totals: TripTotal[], now: Date): boolean {
  if (!trip || now.getTime() - trip.end.getTime() > TRIP_MAX_GAP_MS) return false;
  return totals.some((x) => totalMatchesTrip(x, trip));
}

export const tripSkipKey = (trip: ShoppingTrip): string => `${trip.id}#${trip.purchases.length}`;
