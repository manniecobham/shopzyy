import { normalizeUUID } from '../../lib/uuid';
import { NameNormalizer } from '../../logic/NameNormalizer';
import { isHouseholdTheme, isListGrouping, isItemCategory, isHouseRoom, isMeasurementUnit } from '../../models/enums';
import type { CustomOption, GroceryItem, Household, HouseholdMember, PurchaseRecord, TripTotal } from '../../models/entities';
import { makeHousehold, makeItem, makeMember, makeOption, makePurchase, makeTripTotal } from '../../models/factories';
import type { DataStore } from '../DataStore';
import type { SubCollection } from './schema';

export type DocData = Record<string, unknown>;

// MARK: Value helpers (Firestore Timestamps, numbers and Dates all read back as Date)

export function toDate(v: unknown): Date | null {
  if (v instanceof Date) return v;
  if (v && typeof v === 'object' && typeof (v as { toDate?: unknown }).toDate === 'function') return (v as { toDate(): Date }).toDate();
  if (typeof v === 'number') return new Date(v);
  return null;
}
const str = (v: unknown): string | null => (typeof v === 'string' ? v : null);
const num = (v: unknown, fallback: number): number => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);

// MARK: Entity → document

export function householdDoc(h: Household): DocData {
  return {
    name: h.name, createdAt: h.createdAt, ownerRecordName: h.ownerRecordName, groupingRaw: h.groupingRaw,
    sectionOrder: h.sectionOrder, themeRaw: h.themeRaw, imageFocusX: h.imageFocusX, imageFocusY: h.imageFocusY,
    currencyCode: h.currencyCode,
  };
}
export const memberDoc = (m: HouseholdMember): DocData => ({
  userRecordName: m.userRecordName, name: m.name, emoji: m.emoji, colorHex: m.colorHex, createdAt: m.createdAt,
});
export const optionDoc = (o: CustomOption): DocData => ({ name: o.name, kindRaw: o.kindRaw, createdAt: o.createdAt });
export const itemDoc = (i: GroceryItem): DocData => ({
  name: i.name, normalizedName: i.normalizedName, categoryRaw: i.categoryRaw, roomRaw: i.roomRaw, isOnList: i.isOnList,
  quantity: i.quantity, unitRaw: i.unitRaw, preferredQuantity: i.preferredQuantity, preferredUnitRaw: i.preferredUnitRaw,
  note: i.note, forName: i.forName, addedAt: i.addedAt, snoozedUntil: i.snoozedUntil, createdAt: i.createdAt,
  // References are stored as keys, not Firestore references.
  addedBy: i.addedBy?.userRecordName ?? null,
  assignedTo: i.assignedTo?.userRecordName ?? null,
  forMember: i.forMember?.userRecordName ?? null,
  customCategory: i.customCategory?.id ?? null,
  customRoom: i.customRoom?.id ?? null,
});
export const purchaseDoc = (p: PurchaseRecord): DocData => ({
  purchasedAt: p.purchasedAt, quantity: p.quantity, unitRaw: p.unitRaw, originDeviceID: p.originDeviceID,
  item: p.item?.id ?? null, member: p.member?.userRecordName ?? null,
  ...(p.startsTrip ? { startsTrip: true } : {}),
});
export const tripTotalDoc = (t: TripTotal): DocData => ({
  tripKey: t.tripKey, amount: t.amount, currencyCode: t.currencyCode, storeName: t.storeName,
  tripEndedAt: t.tripEndedAt, enteredBy: t.enteredBy, createdAt: t.createdAt,
});

export const memberKey = (m: HouseholdMember) => m.userRecordName;

// MARK: Document → store (port of CloudRecordStore.apply)

export type ApplyResult = 'applied' | 'missingReferences' | 'ignored';

export interface ApplyContext {
  uid: string | null;
}

export class DocApplier {
  constructor(private readonly store: DataStore, private readonly ctx: ApplyContext) {}

  applyHousehold(householdID: string, data: DocData): ApplyResult {
    const id = normalizeUUID(householdID);
    let h = this.store.household(id);
    if (!h) {
      h = this.store.insertHousehold(makeHousehold({ id, name: '', ownerRecordName: '', isOwnedByMe: false }));
      this.store.removedHouseholds.delete(id); // it exists on the server again (e.g. invited back)
    }
    h.name = str(data.name) ?? h.name;
    h.createdAt = toDate(data.createdAt) ?? h.createdAt;
    h.ownerRecordName = str(data.ownerRecordName) ?? h.ownerRecordName;
    h.isOwnedByMe = !!this.ctx.uid && data.ownerUID === this.ctx.uid;
    h.groupingRaw = isListGrouping(str(data.groupingRaw)) ? (data.groupingRaw as Household['groupingRaw']) : 'category';
    h.sectionOrder = Array.isArray(data.sectionOrder) ? data.sectionOrder.filter((k): k is string => typeof k === 'string') : [];
    h.themeRaw = isHouseholdTheme(str(data.themeRaw)) ? (data.themeRaw as Household['themeRaw']) : 'sunny';
    h.imageFocusX = num(data.imageFocusX, 0.5);
    h.imageFocusY = num(data.imageFocusY, 0.5);
    h.currencyCode = str(data.currencyCode) ?? '';
    return 'applied';
  }

  applyBanner(householdID: string, base64: string | null): void {
    const h = this.store.household(normalizeUUID(householdID));
    if (h) h.customImage = base64;
  }

  apply(kind: SubCollection, householdID: string, key: string, data: DocData): ApplyResult {
    const hid = normalizeUUID(householdID);
    switch (kind) {
      case 'members': return this.applyMember(hid, key, data);
      case 'options': return this.applyOption(hid, key, data);
      case 'items': return this.applyItem(hid, key, data);
      case 'purchases': return this.applyPurchase(hid, key, data);
      case 'tripTotals': return this.applyTripTotal(hid, key, data);
    }
  }

  private applyMember(hid: string, key: string, d: DocData): ApplyResult {
    const m = this.store.member(key, hid) ?? this.store.insertMember(makeMember(hid, key, { name: '', emoji: '🙂', colorHex: '#34C759' }));
    m.name = str(d.name) ?? '';
    m.emoji = str(d.emoji) ?? m.emoji;
    m.colorHex = str(d.colorHex) ?? m.colorHex;
    m.createdAt = toDate(d.createdAt) ?? m.createdAt;
    return 'applied';
  }

  private applyOption(hid: string, key: string, d: DocData): ApplyResult {
    const id = normalizeUUID(key);
    let o = this.store.optionByID(id);
    if (!o) { o = makeOption('', 'category', hid); o.id = id; this.store.insertOption(o); }
    o.name = str(d.name) ?? '';
    o.kindRaw = d.kindRaw === 'room' ? 'room' : 'category';
    o.createdAt = toDate(d.createdAt) ?? o.createdAt;
    return 'applied';
  }

  private applyItem(hid: string, key: string, d: DocData): ApplyResult {
    const id = normalizeUUID(key);
    let complete = true;
    let i = this.store.item(id);
    if (!i) { i = makeItem('', 'other', hid); i.id = id; this.store.insertItem(i); }
    i.name = str(d.name) ?? '';
    i.normalizedName = str(d.normalizedName) ?? NameNormalizer.key(i.name);
    i.categoryRaw = isItemCategory(str(d.categoryRaw)) ? (d.categoryRaw as GroceryItem['categoryRaw']) : 'other';
    i.roomRaw = isHouseRoom(str(d.roomRaw)) ? (d.roomRaw as GroceryItem['roomRaw']) : null;
    i.isOnList = d.isOnList === true;
    i.quantity = num(d.quantity, 1);
    i.unitRaw = isMeasurementUnit(str(d.unitRaw)) ? (d.unitRaw as GroceryItem['unitRaw']) : null;
    i.preferredQuantity = num(d.preferredQuantity, 1);
    i.preferredUnitRaw = isMeasurementUnit(str(d.preferredUnitRaw)) ? (d.preferredUnitRaw as GroceryItem['preferredUnitRaw']) : null;
    i.note = str(d.note);
    i.forName = str(d.forName);
    i.addedAt = toDate(d.addedAt);
    i.snoozedUntil = toDate(d.snoozedUntil);
    i.createdAt = toDate(d.createdAt) ?? i.createdAt;

    const member = (k: unknown) => this.resolve(str(k), (v) => this.store.member(v, hid), () => (complete = false));
    const option = (k: unknown) => this.resolve(str(k), (v) => this.store.optionByID(normalizeUUID(v)), () => (complete = false));
    i.addedBy = member(d.addedBy);
    i.assignedTo = member(d.assignedTo);
    i.forMember = member(d.forMember);
    i.customCategory = option(d.customCategory);
    i.customRoom = option(d.customRoom);
    return complete ? 'applied' : 'missingReferences';
  }

  private applyPurchase(hid: string, key: string, d: DocData): ApplyResult {
    const id = normalizeUUID(key);
    let complete = true;
    let p = this.store.purchase(id);
    if (!p) { p = makePurchase(new Date(), 1, null, '', hid); p.id = id; this.store.insertPurchase(p); }
    p.purchasedAt = toDate(d.purchasedAt) ?? p.purchasedAt;
    p.quantity = num(d.quantity, 1);
    p.unitRaw = isMeasurementUnit(str(d.unitRaw)) ? (d.unitRaw as PurchaseRecord['unitRaw']) : null;
    p.originDeviceID = str(d.originDeviceID) ?? '';
    p.startsTrip = d.startsTrip === true;
    const item = this.resolve(str(d.item), (v) => this.store.item(normalizeUUID(v)), () => (complete = false));
    const member = this.resolve(str(d.member), (v) => this.store.member(v, hid), () => (complete = false));
    this.store.linkPurchase(p, item, member);
    return complete ? 'applied' : 'missingReferences';
  }

  private applyTripTotal(hid: string, key: string, d: DocData): ApplyResult {
    const id = normalizeUUID(key);
    let t = this.store.tripTotal(id);
    if (!t) {
      t = makeTripTotal({ householdID: hid, tripKey: '', amount: 0, currencyCode: '', storeName: null, tripEndedAt: new Date(), enteredBy: null });
      t.id = id;
      this.store.insertTripTotal(t);
    }
    t.tripKey = str(d.tripKey) ?? '';
    t.amount = num(d.amount, 0);
    t.currencyCode = str(d.currencyCode) ?? '';
    t.storeName = str(d.storeName);
    t.tripEndedAt = toDate(d.tripEndedAt) ?? t.tripEndedAt;
    t.enteredBy = str(d.enteredBy);
    t.createdAt = toDate(d.createdAt) ?? t.createdAt;
    return 'applied';
  }

  remove(kind: SubCollection, householdID: string, key: string): void {
    const hid = normalizeUUID(householdID);
    const s = this.store;
    switch (kind) {
      case 'members': { const m = s.member(key, hid); if (m) s.deleteMember(m); break; }
      case 'options': { const o = s.optionByID(normalizeUUID(key)); if (o) s.deleteOption(o); break; }
      case 'items': { const i = s.item(normalizeUUID(key)); if (i) s.deleteItem(i); break; }
      case 'purchases': { const p = s.purchase(normalizeUUID(key)); if (p) s.deletePurchase(p); break; }
      case 'tripTotals': { const t = s.tripTotal(normalizeUUID(key)); if (t) s.deleteTripTotal(t); break; }
    }
  }

  private resolve<T>(key: string | null, lookup: (k: string) => T | undefined, markIncomplete: () => void): T | null {
    if (key === null) return null;
    const target = lookup(key);
    if (!target) markIncomplete();
    return target ?? null;
  }
}
