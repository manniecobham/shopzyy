import { groupActivityTrips, periodSpend, tripsForPeriod } from '../src/logic/activityTrips';
import { makeMember, makePurchase, makeTripTotal, suggestedProfile } from '../src/models/factories';
import { makeEnv } from './env';
import { makeItem } from '../src/models/factories';
import { uuid } from '../src/lib/uuid';
import { NOW } from './testSupport';

const mins = (m: number) => new Date(NOW.getTime() - m * 60_000);

function setup() {
  const env = makeEnv();
  const hid = uuid();
  const ada = env.store.insertMember(makeMember(hid, '_ada', suggestedProfile('Ada')));
  const buy = (name: string, minutesAgo: number) => {
    const item = env.store.insertItem(makeItem(name, 'other', hid));
    const p = env.store.insertPurchase(makePurchase(mins(minutesAgo), 1, null, 'dev', hid));
    env.store.linkPurchase(p, item, ada);
    return p;
  };
  return { env, hid, buy };
}

describe('Activity trips', () => {
  test('purchases group into trips, newest first, with items newest first', () => {
    const { env, hid, buy } = setup();
    buy('Milk', 400); buy('Eggs', 395); buy('Bread', 30); buy('Jam', 10);
    const trips = groupActivityTrips(env.store.allPurchases(), [], hid);
    expect(trips.map((t) => t.records.map((r) => r.item!.name))).toEqual([['Jam', 'Bread'], ['Eggs', 'Milk']]);
  });

  test('a trip picks up its total, and the period spend adds totals in one currency', () => {
    const { env, hid, buy } = setup();
    buy('Milk', 400); buy('Bread', 10);
    const first = groupActivityTrips(env.store.allPurchases(), [], hid);
    const totals = first.map((t, i) => makeTripTotal({ householdID: hid, tripKey: t.trip.id, amount: 10 + i, currencyCode: 'EUR', storeName: null, tripEndedAt: t.trip.end, enteredBy: '_ada' }));
    const trips = groupActivityTrips(env.store.allPurchases(), totals, hid);
    expect(trips.every((t) => t.total)).toBe(true);
    expect(periodSpend(trips)).toEqual({ amount: 21, currency: 'EUR' });
    totals[0].currencyCode = 'GBP';
    expect(periodSpend(groupActivityTrips(env.store.allPurchases(), totals, hid))).toBeNull();
  });

  test('periods narrow the list; "latest" shows three trips', () => {
    const { env, hid, buy } = setup();
    [10, 200, 400, 600, 20_000].forEach((m, i) => buy(`Item${i}`, m * 1));
    const all = groupActivityTrips(env.store.allPurchases(), [], hid);
    expect(tripsForPeriod(all, 'latest', NOW)).toHaveLength(3);
    expect(tripsForPeriod(all, 'week', NOW).length).toBeLessThan(all.length);
    expect(tripsForPeriod(all, 'all', NOW)).toHaveLength(all.length);
  });
});
