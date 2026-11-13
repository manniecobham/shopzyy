import { TRIP_QUIET_PERIOD_MS, groupTrips, tripBody, tripContaining, totalMatchesTrip, type TripPurchase } from '../functions/src/tripLogic';
import { ShoppingTrip } from '../src/logic/ShoppingTrip';
import { totalMatchesTrip as appMatches } from '../src/logic/tripTotals';
import { makeTripTotal } from '../src/models/factories';

const H = '11111111-2222-3333-4444-555555555555';
const base = Date.UTC(2026, 2, 18, 12);
const p = (id: string, minsAgo: number): TripPurchase => ({ id, purchasedAtMs: base - minsAgo * 60_000, itemID: id });

describe('push alert trip logic (server copy)', () => {
  test('a purchase flagged as starting a trip splits the server grouping too', () => {
    const fresh = { ...p('jam', 5), startsTrip: true };
    const trips = groupTrips(H, '_ada', [p('milk', 20), p('eggs', 15), fresh, p('bread', 2)]);
    expect(trips.map((t) => t.purchases.length)).toEqual([2, 2]);
  });

  test('splits on long pauses, like the app', () => {
    const trips = groupTrips(H, '_ada', [p('milk', 300), p('eggs', 295), p('bread', 30), p('jam', 10)]);
    expect(trips.map((t) => t.purchases.map((x) => x.id))).toEqual([['milk', 'eggs'], ['bread', 'jam']]);
    expect(tripContaining(trips, 'jam')!.purchases).toHaveLength(2);
  });

  test('the trip id matches the app, so a later push replaces the earlier notification', () => {
    const server = groupTrips(H, '_ada', [p('a', 50), p('b', 40)])[0];
    const app = ShoppingTrip.group([
      { householdID: H, buyerKey: '_ada', buyerName: 'Ada', purchase: { id: 'a', itemName: 'A', purchasedAt: new Date(base - 50 * 60_000) } },
      { householdID: H, buyerKey: '_ada', buyerName: 'Ada', purchase: { id: 'b', itemName: 'B', purchasedAt: new Date(base - 40 * 60_000) } },
    ])[0];
    expect(server.id).toBe(app.id);
  });

  test('summary text matches the app', () => {
    expect(tripBody(['Milk', 'Eggs', 'Bread', 'Jam', 'Rice'])).toBe('5 items · Milk, Eggs, Bread and 2 more');
    expect(tripBody(['Milk'], 3, '€4.20')).toBe('1 item · Milk · €4.20');
  });

  test('a total is matched to its trip exactly like the app does', () => {
    const trip = groupTrips(H, '_ada', [p('a', 20), p('b', 10)])[0];
    const appTrip = ShoppingTrip.group([
      { householdID: H, buyerKey: '_ada', buyerName: 'Ada', purchase: { id: 'a', itemName: 'A', purchasedAt: new Date(base - 20 * 60_000) } },
      { householdID: H, buyerKey: '_ada', buyerName: 'Ada', purchase: { id: 'b', itemName: 'B', purchasedAt: new Date(base - 10 * 60_000) } },
    ])[0];
    for (const [key, by] of [[trip.id, '_ada'], ['other', '_ada'], ['other', '_bo']] as const) {
      const server = totalMatchesTrip({ tripKey: key, enteredBy: by, tripEndedAtMs: trip.endMs }, trip);
      const app = appMatches(makeTripTotal({ householdID: H, tripKey: key, amount: 1, currencyCode: 'EUR', storeName: null, tripEndedAt: new Date(trip.endMs), enteredBy: by }), appTrip);
      expect(server).toBe(app);
    }
  });

  test('the quiet period is the same five minutes', () => {
    expect(TRIP_QUIET_PERIOD_MS).toBe(5 * 60_000);
  });
});

import { MESSAGES, LANGS, normalizeLang, tripSummary, tripTitle } from '../functions/src/messages';

describe('localised push text', () => {
  test('every language defines every template', () => {
    for (const l of LANGS) expect(Object.keys(MESSAGES[l]).sort()).toEqual(Object.keys(MESSAGES.en).sort());
  });
  test('falls back to English for unknown languages', () => {
    expect(normalizeLang('fr-CA')).toBe('fr');
    expect(normalizeLang('ja')).toBe('en');
    expect(normalizeLang(undefined)).toBe('en');
  });
  test('plurals and wording per language', () => {
    expect(tripSummary(['Leche'], 3, null, 'es')).toBe('1 artículo · Leche');
    expect(tripSummary(['a', 'b', 'c', 'd', 'e'], 3, '5,00 €', 'de')).toBe('5 Artikel · a, b, c und 2 weitere · 5,00 €');
    expect(tripTitle('Ada', 'nl')).toBe('Ada is boodschappen gaan doen');
  });

  test('purchases with the same timestamp have one stable last purchase, so only one push is sent', () => {
    const same = (id: string): TripPurchase => ({ id, purchasedAtMs: base, itemID: id });
    const a = groupTrips(H, '_ada', [same('c'), same('a'), same('b')])[0];
    const b = groupTrips(H, '_ada', [same('b'), same('c'), same('a')])[0];
    expect(a.purchases[a.purchases.length - 1].id).toBe('c');
    expect(b.purchases[b.purchases.length - 1].id).toBe('c');
  });
});
