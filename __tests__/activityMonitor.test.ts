import { scanForRemotePurchases } from '../src/services/ActivityMonitor';
import { makeItem, makeMember, makePurchase, makeTripTotal, suggestedProfile } from '../src/models/factories';
import type { Notifier } from '../src/services/ports';
import { noopNotifier } from '../src/services/ports';
import { makeEnv } from './env';
import { uuid } from '../src/lib/uuid';
import { NOW } from './testSupport';

class MemoryJSON {
  private m = new Map<string, unknown>();
  getJSON<T>(k: string): T | null { return (this.m.get(k) as T) ?? null; }
  setJSON(k: string, v: unknown) { this.m.set(k, v); }
}

function setup() {
  const posted: { trip: string; total: string | null; household: string | null }[] = [];
  const notifier: Notifier = { ...noopNotifier, postShoppingTrip: async (trip, household, total) => { posted.push({ trip: trip.body(), total, household }); } };
  const env = { ...makeEnv(), notifier };
  const hid = uuid();
  const ada = env.store.insertMember(makeMember(hid, '_ada', suggestedProfile('Ada')));
  const buy = (name: string, minsAgo: number, device = 'remote-device') => {
    const item = env.store.insertItem(makeItem(name, 'other', hid));
    const p = env.store.insertPurchase(makePurchase(new Date(NOW.getTime() - minsAgo * 60_000), 1, null, device, hid));
    env.store.linkPurchase(p, item, ada);
  };
  return { env, hid, buy, posted, prefs: new MemoryJSON() };
}

describe('ActivityMonitor', () => {
  test('announces other devices’ trips once, not this device’s own', () => {
    const { env, buy, posted, prefs } = setup();
    buy('Milk', 20); buy('Eggs', 15); buy('Mine', 10, env.prefs.deviceID);
    scanForRemotePurchases(env, prefs, NOW);
    scanForRemotePurchases(env, prefs, NOW);
    expect(posted).toHaveLength(1);
    expect(posted[0].trip).toBe('2 items · Milk, Eggs');
  });

  test('a growing trip is announced again, and so is a trip that gains a total', () => {
    const { env, hid, buy, posted, prefs } = setup();
    buy('Milk', 20);
    scanForRemotePurchases(env, prefs, NOW);
    buy('Eggs', 10);
    scanForRemotePurchases(env, prefs, NOW);
    expect(posted).toHaveLength(2);
    env.store.insertTripTotal(makeTripTotal({ householdID: hid, tripKey: 'x', amount: 12.5, currencyCode: 'EUR', storeName: null, tripEndedAt: new Date(NOW.getTime() - 10 * 60_000), enteredBy: '_ada' }));
    scanForRemotePurchases(env, prefs, NOW);
    expect(posted).toHaveLength(3);
    expect(posted[2].total).toMatch(/12[.,]50/);
  });

  test('purchases older than a day are ignored (no replay on a new phone)', () => {
    const { env, buy, posted, prefs } = setup();
    buy('Old', 60 * 30);
    scanForRemotePurchases(env, prefs, NOW);
    expect(posted).toHaveLength(0);
  });
});
