import { ShoppingTrip, TRIP_QUIET_PERIOD_MS, type TripPurchase } from '../src/logic/ShoppingTrip';
import { continuesClosedTrip, totalMatchesTrip } from '../src/logic/tripTotals';
import { makeTripTotal } from '../src/models/factories';
import { uuid } from '../src/lib/uuid';
import { NOW } from './testSupport';

const home = uuid();
const purchase = (name: string, minutesAgo: number, buyer = '_ada') => ({
  householdID: home,
  buyerKey: buyer as string | null,
  buyerName: buyer === '_ada' ? 'Ada' : 'Tunde',
  purchase: { id: uuid(), itemName: name, purchasedAt: new Date(NOW.getTime() - minutesAgo * 60_000) } as TripPurchase,
});

describe('Shopping trips', () => {
  test('the new-trip question is only asked within an hour of a trip that already has a total', () => {
    const at = (minutesAgo: number) => ShoppingTrip.group([purchase('Milk', minutesAgo)])[0];
    const totalFor = (trip: ShoppingTrip) => makeTripTotal({ householdID: home, tripKey: trip.id, amount: 10, currencyCode: 'EUR', storeName: null, tripEndedAt: trip.end, enteredBy: '_ada' });
    const recent = at(30), old = at(61);
    expect(continuesClosedTrip(recent, [totalFor(recent)], NOW)).toBe(true);
    expect(continuesClosedTrip(old, [totalFor(old)], NOW)).toBe(false);
    expect(continuesClosedTrip(recent, [], NOW)).toBe(false);
    expect(continuesClosedTrip(null, [], NOW)).toBe(false);
  });

  test('a purchase flagged as starting a trip splits an otherwise continuous trip', () => {
    const fresh = purchase('Jam', 5);
    fresh.purchase.startsTrip = true;
    const trips = ShoppingTrip.group([purchase('Milk', 20), purchase('Eggs', 15), fresh, purchase('Bread', 2)]);
    expect(trips.map((t) => t.purchases.length)).toEqual([2, 2]);
  });

  test('purchases close together are one trip; a long pause starts another', () => {
    const trips = ShoppingTrip.group([purchase('Milk', 300), purchase('Eggs', 295), purchase('Bread', 30), purchase('Jam', 10)]);
    expect(trips.map((t) => t.purchases.map((p) => p.itemName))).toEqual([['Milk', 'Eggs'], ['Bread', 'Jam']]);
  });
  test('each buyer gets their own trip', () => {
    const trips = ShoppingTrip.group([purchase('Milk', 20), purchase('Coffee', 15, '_tunde')]);
    expect(new Set(trips.map((t) => t.buyerName))).toEqual(new Set(['Ada', 'Tunde']));
  });
  test('the trip id stays the same as more items are bought', () => {
    const first = ShoppingTrip.group([purchase('Milk', 30)]);
    const grown = ShoppingTrip.group([purchase('Milk', 30), purchase('Eggs', 5)]);
    expect(first[0].id).toBe(grown[0].id);
  });
  test('summary text lists a few items and counts the rest', () => {
    const trip = ShoppingTrip.group(['Milk', 'Eggs', 'Bread', 'Jam', 'Rice'].map((n, i) => purchase(n, 50 - i)))[0];
    expect(trip.title).toBe('Ada went shopping');
    expect(trip.body()).toBe('5 items · Milk, Eggs, Bread and 2 more');
    expect(trip.announceAt.getTime()).toBe(trip.end.getTime() + 5 * 60_000);
  });
});

describe('Shopping totals and prompts', () => {
  const trip = (gaps: number[]) => {
    let time = NOW.getTime();
    const purchases: TripPurchase[] = [{ id: uuid(), itemName: 'Item', purchasedAt: new Date(time) }];
    for (const g of gaps) { time += g * 1000; purchases.push({ id: uuid(), itemName: 'Item', purchasedAt: new Date(time) }); }
    return new ShoppingTrip(home, '_ama', 'Ama', purchases);
  };

  test('the shopper is asked for the total within seconds, following their pace', () => {
    expect(trip([]).promptDelay).toBe(30);
    expect(trip([2, 3, 2]).promptDelay).toBe(15);
    expect(trip([8, 10, 9]).promptDelay).toBe(27);
    expect(trip([60, 80, 70]).promptDelay).toBe(45);
    expect(trip([5, 600, 5]).promptDelay).toBe(15);
    const slow = trip([10]);
    expect(slow.promptDelay * 1000).toBeLessThan(TRIP_QUIET_PERIOD_MS);
    expect(slow.promptAt.getTime()).toBe(slow.end.getTime() + slow.promptDelay * 1000);
  });

  test('the notification for other members includes the total when there is one', () => {
    const t = trip([5, 5]);
    expect(t.body()).toBe('3 items · Item, Item, Item');
    expect(t.body(3, '€42.50')).toBe('3 items · Item, Item, Item · €42.50');
  });

  test('a total is matched to its trip, even when the trip id differs slightly', () => {
    const t = trip([5, 5]);
    const mk = (tripKey: string, enteredBy: string) => makeTripTotal({ householdID: home, tripKey, amount: 1, currencyCode: 'EUR', storeName: null, tripEndedAt: t.end, enteredBy });
    expect(totalMatchesTrip(mk(t.id, '_ama'), t)).toBe(true);
    expect(totalMatchesTrip(mk('other', '_ama'), t)).toBe(true);
    expect(totalMatchesTrip(mk('other', '_bo'), t)).toBe(false);
  });
});
