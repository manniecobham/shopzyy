import { coreDataDate, parseLegacyStore, toWire } from '../src/migration/legacyParser';
import type { LegacyStore } from '../modules/shopzy-legacy';
import fixture from './fixtures/legacyStore.json';

// A real SwiftData store written by the Swift app's own models, read by the Swift LegacyStoreReader.
const store = fixture as unknown as LegacyStore;
const HOME = '11111111-2222-3333-4444-555555555555';

describe('legacy store parsing', () => {
  const data = parseLegacyStore(store);
  const home = data.households.find((h) => h.householdID === HOME)!;

  test('households, ownership and household settings come through', () => {
    expect(data.households).toHaveLength(2);
    expect(home.isOwnedByMe).toBe(true);
    expect(home.ownerRecordName).toBe('_owner123');
    expect(home.household).toMatchObject({ name: 'Home', groupingRaw: 'room', themeRaw: 'party', currencyCode: 'GBP', imageFocusX: 0.2, imageFocusY: 0.7, sectionOrder: ['category:dairy', 'room:kitchen'] });
    expect(home.banner).toBeTruthy();
    expect(data.households.find((h) => h.name === 'Office')!.isOwnedByMe).toBe(false);
  });

  test('relationships are rebuilt from the integer keys and stored as the sync layer expects', () => {
    const item = home.items[0].data;
    expect(item).toMatchObject({ name: 'Milk', isOnList: true, quantity: 2, unitRaw: 'liter', note: 'low fat', forName: 'kids', categoryRaw: 'dairy' });
    expect(item.addedBy).toBe('_owner123');
    expect(item.assignedTo).toBe('_owner123');
    expect(item.forMember).toBe('_owner123');
    expect(item.customCategory).toBe(home.options.find((o) => o.data.name === 'Fridge')!.id);
    expect(item.customRoom).toBe(home.options.find((o) => o.data.name === 'Patio')!.id);
    expect(home.items[0].id).toBe('1C7D43D3-031A-480A-BA3C-1B89443D3413'); // uppercase, like Swift's uuidString
  });

  test('purchases, members and trip totals carry over with their links', () => {
    expect(home.purchases[0].data).toMatchObject({ item: home.items[0].id, member: '_owner123', originDeviceID: 'dev-1', unitRaw: 'liter' });
    expect(home.members[0]).toMatchObject({ id: '_owner123', data: { name: 'Ada', emoji: '👩🏾', colorHex: '#0A84FF' } });
    expect(home.tripTotals[0].data).toMatchObject({ tripKey: 'trip-1', amount: 12.3, currencyCode: 'GBP', storeName: 'Tesco', enteredBy: '_owner123' });
  });

  test('Core Data dates (seconds since 2001) become real dates', () => {
    expect(coreDataDate(0)!.toISOString()).toBe('2001-01-01T00:00:00.000Z');
    expect((home.items[0].data.addedAt as Date).toISOString()).toBe('2023-11-14T22:13:20.000Z'); // 721692800 s after 2001
  });

  test('a first-release (V1) store with no focus, currency or totals still migrates with the old defaults', () => {
    const v1 = JSON.parse(JSON.stringify(store)) as LegacyStore;
    for (const h of v1.households) { delete h.ZIMAGEFOCUSX; delete h.ZIMAGEFOCUSY; delete h.ZCURRENCYCODE; }
    v1.tripTotals = [];
    const parsed = parseLegacyStore(v1).households.find((h) => h.householdID === HOME)!;
    expect(parsed.household).toMatchObject({ imageFocusX: 0.5, imageFocusY: 0.5, currencyCode: '' });
    expect(parsed.tripTotals).toEqual([]);
    expect(parsed.items).toHaveLength(1);
  });

  test('rows that point at missing households, and purchases whose item is gone, are dropped', () => {
    const broken = JSON.parse(JSON.stringify(store)) as LegacyStore;
    broken.items[0].ZHOUSEHOLDID = 'FFFFFFFF-FFFF-FFFF-FFFF-FFFFFFFFFFFF';
    const parsed = parseLegacyStore(broken).households.find((h) => h.householdID === HOME)!;
    expect(parsed.items).toEqual([]);
    expect(parsed.purchases).toEqual([]);
  });

  test('the wire format keeps dates', () => {
    expect(toWire({ a: new Date(5), b: [new Date(6)], c: null })).toEqual({ a: { __date: 5 }, b: [{ __date: 6 }], c: null });
  });

  test('record counts add up', () => {
    // Home: household + member + 2 options + item + purchase + total = 7, plus the empty Office household.
    expect(data.recordCount).toBe(8);
  });
});
