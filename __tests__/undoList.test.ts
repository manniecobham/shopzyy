import { fixture } from './env';

describe('Undoing list actions', () => {
  test('undoing an add removes a brand new item', () => {
    const f = fixture();
    const before = f.list.snapshotItems();
    const items = f.list.addFromText('milk', null);
    f.list.undoAdd(items, before);
    expect(f.store.itemsIn(f.list.householdID)).toHaveLength(0);
  });

  test('undoing an add restores the earlier quantity of an item already on the list', () => {
    const f = fixture();
    const [first] = f.list.addFromText('1 kg rice', null);
    const before = f.list.snapshotItems();
    const items = f.list.addFromText('2 kg rice', null);
    expect(items[0].quantity).toBe(3);
    f.list.undoAdd(items, before);
    expect(first.quantity).toBe(1);
    expect(first.isOnList).toBe(true);
  });

  test('undoing a tick-off puts the item back on the list and removes the purchase', () => {
    const f = fixture();
    const [item] = f.list.addFromText('eggs', null);
    const record = f.list.markBought(item, null)!;
    expect(item.isOnList).toBe(false);
    f.list.undoPurchase(record);
    expect(item.isOnList).toBe(true);
    expect(f.store.purchasesIn(f.list.householdID)).toHaveLength(0);
  });
});
