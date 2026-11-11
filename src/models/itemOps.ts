import { describeQuantity, plainQuantity, isHouseRoom, isItemCategory, isMeasurementUnit, type MeasurementUnit } from './enums';
import { builtIn, custom, type CategoryChoice, type RoomChoice } from './choices';
import type { AutocompleteCandidate } from '../logic/AutocompleteRanker';
import type { PurchaseHistory } from '../logic/SuggestionEngine';
import { NameNormalizer } from '../logic/NameNormalizer';
import type { GroceryItem, HouseholdMember, PurchaseRecord } from './entities';

/** Who a list item is for: someone in the household, or anyone else by name. */
export type ItemRecipient = { kind: 'member'; member: HouseholdMember } | { kind: 'named'; name: string };

export const recipientName = (r: ItemRecipient) => (r.kind === 'member' ? r.member.name : r.name);
export const sameRecipient = (a: ItemRecipient | null, b: ItemRecipient | null) => {
  if (!a || !b) return !a && !b;
  if (a.kind === 'member' && b.kind === 'member') return a.member.id === b.member.id;
  if (a.kind === 'named' && b.kind === 'named') return a.name === b.name;
  return false;
};

export const itemCategory = (i: GroceryItem) => (isItemCategory(i.categoryRaw) ? i.categoryRaw : 'other');

/** The category shown to people: the household's own if chosen, else the built-in aisle. */
export function getCategoryChoice(i: GroceryItem): CategoryChoice {
  return i.customCategory ? custom(i.customCategory) : builtIn(itemCategory(i));
}
export function setCategoryChoice(i: GroceryItem, choice: CategoryChoice): void {
  if (choice.kind === 'builtIn') {
    i.categoryRaw = choice.value;
    i.customCategory = null;
  } else {
    i.customCategory = choice.option;
  }
}

export function getRoomChoice(i: GroceryItem): RoomChoice | null {
  if (i.customRoom) return custom(i.customRoom);
  return isHouseRoom(i.roomRaw) ? builtIn(i.roomRaw) : null;
}
export function setRoomChoice(i: GroceryItem, choice: RoomChoice | null): void {
  if (!choice) { i.roomRaw = null; i.customRoom = null; }
  else if (choice.kind === 'builtIn') { i.roomRaw = choice.value; i.customRoom = null; }
  else { i.roomRaw = null; i.customRoom = choice.option; }
}

export function getRecipient(i: GroceryItem): ItemRecipient | null {
  if (i.forMember) return { kind: 'member', member: i.forMember };
  return i.forName !== null ? { kind: 'named', name: i.forName } : null;
}
export function setRecipient(i: GroceryItem, r: ItemRecipient | null): void {
  if (!r) { i.forMember = null; i.forName = null; }
  else if (r.kind === 'member') { i.forMember = r.member; i.forName = null; }
  else {
    i.forMember = null;
    const clean = r.name.trim();
    i.forName = clean === '' ? null : clean;
  }
}

export const itemUnit = (i: GroceryItem): MeasurementUnit | null => (isMeasurementUnit(i.unitRaw) ? i.unitRaw : null);
export const itemPreferredUnit = (i: GroceryItem): MeasurementUnit | null => (isMeasurementUnit(i.preferredUnitRaw) ? i.preferredUnitRaw : null);
export const itemQuantityText = (i: GroceryItem) => describeQuantity(i.quantity, itemUnit(i));
export const purchaseCount = (i: GroceryItem) => i.purchases.length;

export function lastPurchase(i: GroceryItem): PurchaseRecord | null {
  let best: PurchaseRecord | null = null;
  for (const p of i.purchases) if (!best || p.purchasedAt > best.purchasedAt) best = p;
  return best;
}

export const itemHistory = (i: GroceryItem): PurchaseHistory => ({
  itemID: i.id, name: i.name, purchaseDates: i.purchases.map((p) => p.purchasedAt), isOnList: i.isOnList, snoozedUntil: i.snoozedUntil,
});

export const autocompleteCandidate = (i: GroceryItem): AutocompleteCandidate => ({
  id: i.id, name: i.name, popularity: purchaseCount(i), isOnList: i.isOnList,
});

export function renameItem(i: GroceryItem, newName: string): void {
  i.name = newName;
  i.normalizedName = NameNormalizer.key(newName);
}

export function putOnList(i: GroceryItem, quantity: number, unit: MeasurementUnit | null, by: HouseholdMember | null, at: Date): void {
  i.isOnList = true;
  i.quantity = quantity;
  i.unitRaw = unit;
  i.addedBy = by;
  i.addedAt = at;
  i.snoozedUntil = null;
}

/** Clears everything about this trip's list entry: who added it, who was asked to buy it, who it's for, the note. */
export function takeOffList(i: GroceryItem): void {
  i.isOnList = false;
  i.addedBy = null;
  i.addedAt = null;
  i.assignedTo = null;
  setRecipient(i, null);
  i.note = null;
}

export const purchaseUnit = (p: PurchaseRecord): MeasurementUnit | null => (isMeasurementUnit(p.unitRaw) ? p.unitRaw : null);
export const purchaseQuantityText = (p: PurchaseRecord) => describeQuantity(p.quantity, purchaseUnit(p));
export const purchaseItemName = (p: PurchaseRecord) => p.item?.name ?? 'an item';
export const purchaseMemberName = (p: PurchaseRecord) => p.member?.name ?? 'Someone';

/** Quantity as plain text for editing ("1.5", "2"). */
export const plainQty = (q: number): string => plainQuantity(q);
