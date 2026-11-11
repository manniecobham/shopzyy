import { ShoppingTrip, type TripPurchase } from '../src/logic/ShoppingTrip';
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
