import { NameNormalizer } from '../logic/NameNormalizer';
import { ShoppingTrip } from '../logic/ShoppingTrip';
import type { GroceryItem, HouseholdMember, PurchaseRecord } from '../models/entities';
import type { HouseholdService } from './HouseholdService';
import type { ShoppingListService } from './ShoppingListService';

export interface ReceiptEntry { name: string; quantity: number; item: GroceryItem | null }

export function importReceipt(a: {
  list: ShoppingListService; households: HouseholdService; householdID: string; by: HouseholdMember | null;
  entries: ReceiptEntry[]; total: number; currencyCode: string; storeName: string | null;
}): { count: number; undo: () => void } {
  const base = Date.now() - a.entries.length;
  const bought: { record: PurchaseRecord; created: GroceryItem | null }[] = [];
  a.entries.forEach((entry, i) => {
    const at = new Date(base + i);
    const created = entry.item ? null : a.list.add({ name: NameNormalizer.displayName(entry.name), quantity: entry.quantity, unit: null, hasExplicitQuantity: entry.quantity !== 1 }, a.by, at, false);
    const item = entry.item ?? created;
    const record = item ? a.list.markBought(item, a.by, at, i === 0, false) : null;
    if (record) bought.push({ record, created: created && !entry.item ? created : null });
  });
  a.list.refreshRestockReminders();
  if (bought.length === 0) return { count: 0, undo: () => {} };

  const times = bought.map((b) => b.record.purchasedAt);
  const trip = new ShoppingTrip(a.householdID, a.by?.userRecordName ?? null, '', times.map((purchasedAt, i) => ({ id: bought[i].record.id, itemName: '', purchasedAt })));
  const total = a.households.saveTripTotal({
    tripKey: trip.id, householdID: a.householdID, endedAt: trip.end, amount: a.total, currencyCode: a.currencyCode,
    storeName: a.storeName, by: a.by?.userRecordName ?? null,
  });

  return {
    count: bought.length,
    undo: () => {
      a.households.deleteTripTotal(total);
      for (const { record, created } of bought) {
        a.list.undoPurchase(record);
        if (created) a.list.removeFromList(created);
      }
    },
  };
}
