import { HouseholdService } from '../src/services/HouseholdService';
import { ShoppingListService } from '../src/services/ShoppingListService';
import { HouseholdGoneError, isHouseholdGone, type SyncBackend } from '../src/services/ports';
import { fixture } from './env';

const ama = { name: 'Ama', emoji: '👩🏾', colorHex: '#0A84FF' };

describe('Households', () => {
  test('creating a household makes the creator its owner and first member', () => {
    const f = fixture();
    const h = f.households.create('  beach house ', '_ama', ama);
    expect(h.name).toBe('Beach house');
    expect(h.isOwnedByMe).toBe(true);
    expect(h.ownerRecordName).toBe('_ama');
    const members = f.store.allMembers();
    expect(members).toHaveLength(1);
    expect(members[0].householdID).toBe(h.id);
    expect(members[0].name).toBe('Ama');
  });

  test("an empty name falls back to the person's name", () => {
    expect(fixture().households.create('', '_ama', ama).name).toBe("Ama's household");
  });

  test('membership is added once and follows profile edits', () => {
    const f = fixture();
    const h = f.households.create('Home', '_ama', ama);
    f.households.ensureMembership(h, '_ama', ama);
    expect(f.store.allMembers()).toHaveLength(1);
    f.households.updateProfile({ name: 'Ama B.', emoji: '🐱', colorHex: '#FF375F' }, '_ama');
    const m = f.store.allMembers()[0];
    expect([m.name, m.emoji]).toEqual(['Ama B.', '🐱']);
  });

  test('lists are separate per household', () => {
    const f = fixture();
    const home = f.households.create('Home', '_ama', ama);
    const office = f.households.create('Office', '_ama', ama);
    const homeList = new ShoppingListService(f.env, home.id);
    const officeList = new ShoppingListService(f.env, office.id);
    homeList.addFromText('milk, eggs', null);
    officeList.addFromText('coffee, milk', null);
    expect(homeList.itemMatching('coffee')).toBeUndefined();
    expect(officeList.itemMatching('eggs')).toBeUndefined();
    expect(homeList.itemMatching('milk')).not.toBe(officeList.itemMatching('milk'));
    expect(f.store.allItems()).toHaveLength(4);
  });

  test('purging a household removes only its data', () => {
    const f = fixture();
    const home = f.households.create('Home', '_ama', ama);
    const office = f.households.create('Office', '_ama', ama);
    const homeList = new ShoppingListService(f.env, home.id);
    const officeList = new ShoppingListService(f.env, office.id);
    const bread = homeList.addFromText('bread', null)[0];
    homeList.markBought(bread, homeList.currentMember());
    homeList.categoryChoiceNamed('Party');
    officeList.addFromText('coffee', null);

    f.households.purgeLocal(home.id);

    expect(f.households.households().map((h) => h.id)).toEqual([office.id]);
    expect(f.store.allItems().map((i) => i.name)).toEqual(['Coffee']);
    expect(f.store.allPurchases()).toHaveLength(0);
    expect(f.store.allOptions()).toHaveLength(0);
    expect(f.store.allMembers().every((m) => m.householdID === office.id)).toBe(true);
  });

  test('removing a household twice reports it as already gone instead of failing', async () => {
    const f = fixture();
    const home = f.households.create('Home', '_ama', ama);
    expect(await f.households.remove(home)).toBe('removed');
    expect(await f.households.remove(home)).toBe('alreadyGone');
    expect(f.households.households()).toEqual([]);
  });

  test('a removed household accepts no more changes, even from a screen still showing it', async () => {
    const f = fixture();
    const home = f.households.create('Home', '_ama', ama);
    const list = new ShoppingListService(f.env, home.id);
    const milk = list.addFromText('milk', null)[0];
    await f.households.remove(home);

    expect(list.addFromText('eggs', null)).toEqual([]);
    expect(list.categoryChoiceNamed('Party')).toBeNull();
    list.markBought(milk, null);
    expect(f.store.allPurchases()).toHaveLength(0);
    expect(f.store.allItems()).toHaveLength(0);
    expect(f.households.isLive(home)).toBe(false);
  });

  test('a household already gone on the server is tidied locally', async () => {
    const f = fixture();
    const sync: SyncBackend = {
      save() {}, delete() {}, createHousehold() {}, deleteHousehold() {}, stop() {},
      availability: async () => 'gone', leave: async () => {}, deleteNow: async () => {}, sendNow: async () => {},
    };
    const svc = new HouseholdService({ ...f.env, sync });
    const home = svc.create('Home', '_ama', ama);
    expect(await svc.remove(home)).toBe('alreadyGone');
    expect(isHouseholdGone(new HouseholdGoneError())).toBe(true);
    expect(isHouseholdGone(new Error('x'))).toBe(false);
  });
});

describe('Shopping totals', () => {
  test('a total is saved once per trip and edited in place', () => {
    const f = fixture();
    const base = { tripKey: 'trip-1', householdID: f.householdID, endedAt: new Date(), currencyCode: 'EUR', by: '_ama' };
    f.households.saveTripTotal({ ...base, amount: 42.5, storeName: '  lidl ' });
    f.households.saveTripTotal({ ...base, amount: 40, storeName: null });
    const totals = f.store.allTripTotals();
    expect(totals).toHaveLength(1);
    expect(totals[0].amount).toBe(40);
    expect(totals[0].storeName).toBeNull();
  });
});
