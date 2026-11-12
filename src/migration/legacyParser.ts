import { DataStore } from '../data/DataStore';
import {
  householdDoc, itemDoc, memberDoc, optionDoc, purchaseDoc, tripTotalDoc, memberKey, type DocData,
} from '../data/sync/mapping';
import { normalizeUUID } from '../lib/uuid';
import { NameNormalizer } from '../logic/NameNormalizer';
import { isHouseholdTheme, isItemCategory, isHouseRoom, isListGrouping, isMeasurementUnit } from '../models/enums';
import type { CustomOption, GroceryItem, Household, HouseholdMember } from '../models/entities';
import { makeHousehold, makeItem, makeMember, makeOption, makePurchase, makeTripTotal } from '../models/factories';
import type { LegacyRow, LegacyStore } from '../../modules/shopzy-legacy';

const CORE_DATA_EPOCH = 978_307_200;
export const coreDataDate = (seconds: unknown): Date | null =>
  typeof seconds === 'number' && Number.isFinite(seconds) ? new Date((seconds + CORE_DATA_EPOCH) * 1000) : null;

const str = (v: unknown): string | null => (typeof v === 'string' && v !== '' ? v : null);
const strOrEmpty = (v: unknown): string => (typeof v === 'string' ? v : '');
const num = (v: unknown, d: number): number => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const pk = (v: unknown): number | null => (typeof v === 'number' ? v : null);

export type DocEntry = { id: string; data: DocData };

export interface LegacyHouseholdSnapshot {
  householdID: string;
  name: string;
  isOwnedByMe: boolean;
  ownerRecordName: string;
  household: DocData;
  banner: string | null;
  members: DocEntry[];
  options: DocEntry[];
  items: DocEntry[];
  purchases: DocEntry[];
  tripTotals: DocEntry[];
}

export interface LegacyData {
  households: LegacyHouseholdSnapshot[];
  recordCount: number;
}

export function parseLegacyStore(rows: LegacyStore): LegacyData {
  const store = new DataStore();
  const owned = new Map<string, boolean>();

  // Z_PK (a per-table integer) → entity, so to-one relationships can be rebuilt.
  const householdsByPK = new Map<number, Household>();
  const membersByPK = new Map<number, HouseholdMember>();
  const optionsByPK = new Map<number, CustomOption>();
  const itemsByPK = new Map<number, GroceryItem>();

  const list = (r: LegacyRow[] | undefined) => r ?? [];
  const idOf = (r: LegacyRow): string | null => { const v = str(r.ZID); return v ? normalizeUUID(v) : null; };
  const householdIDOf = (r: LegacyRow): string | null => { const v = str(r.ZHOUSEHOLDID); return v ? normalizeUUID(v) : null; };

  for (const r of list(rows.households)) {
    const id = idOf(r);
    if (!id) continue;
    const grouping = str(r.ZGROUPINGRAW);
    const theme = str(r.ZTHEMERAW);
    const h = store.insertHousehold(makeHousehold({
      id,
      name: strOrEmpty(r.ZNAME),
      createdAt: coreDataDate(r.ZCREATEDAT) ?? new Date(),
      ownerRecordName: strOrEmpty(r.ZOWNERRECORDNAME),
      isOwnedByMe: r.ZISOWNEDBYME === 1,
      groupingRaw: isListGrouping(grouping) ? grouping : 'category',
      sectionOrder: Array.isArray(r.ZSECTIONORDER) ? r.ZSECTIONORDER.filter((k): k is string => typeof k === 'string') : [],
      themeRaw: isHouseholdTheme(theme) ? theme : 'sunny',
      customImage: str(r.ZCUSTOMIMAGE),
      imageFocusX: num(r.ZIMAGEFOCUSX, 0.5), // absent in V1 stores
      imageFocusY: num(r.ZIMAGEFOCUSY, 0.5),
      currencyCode: strOrEmpty(r.ZCURRENCYCODE), // absent before V3
    }));
    owned.set(id, h.isOwnedByMe);
    const key = pk(r.Z_PK);
    if (key !== null) householdsByPK.set(key, h);
  }
  const hasHousehold = (hid: string | null): hid is string => !!hid && !!store.household(hid);

  for (const r of list(rows.members)) {
    const hid = householdIDOf(r);
    const userKey = str(r.ZUSERRECORDNAME);
    if (!hasHousehold(hid) || !userKey) continue;
    // One member record per person per household (the old CloudKit record name was the user key).
    const existing = store.member(userKey, hid);
    const m = existing ?? store.insertMember(makeMember(hid, userKey, { name: '', emoji: '🙂', colorHex: '#34C759' }));
    m.name = strOrEmpty(r.ZNAME); m.emoji = str(r.ZEMOJI) ?? m.emoji; m.colorHex = str(r.ZCOLORHEX) ?? m.colorHex;
    m.createdAt = coreDataDate(r.ZCREATEDAT) ?? m.createdAt;
    const key = pk(r.Z_PK);
    if (key !== null) membersByPK.set(key, m);
  }

  for (const r of list(rows.options)) {
    const hid = householdIDOf(r); const id = idOf(r);
    if (!hasHousehold(hid) || !id) continue;
    const o = makeOption(strOrEmpty(r.ZNAME), r.ZKINDRAW === 'room' ? 'room' : 'category', hid, coreDataDate(r.ZCREATEDAT) ?? new Date());
    o.id = id;
    store.insertOption(o);
    const key = pk(r.Z_PK);
    if (key !== null) optionsByPK.set(key, o);
  }

  for (const r of list(rows.items)) {
    const hid = householdIDOf(r); const id = idOf(r);
    if (!hasHousehold(hid) || !id) continue;
    const category = str(r.ZCATEGORYRAW); const room = str(r.ZROOMRAW);
    const unit = str(r.ZUNITRAW); const prefUnit = str(r.ZPREFERREDUNITRAW);
    const name = strOrEmpty(r.ZNAME);
    const i = makeItem(name, isItemCategory(category) ? category : 'other', hid, coreDataDate(r.ZCREATEDAT) ?? new Date());
    i.id = id;
    i.normalizedName = str(r.ZNORMALIZEDNAME) ?? NameNormalizer.key(name);
    i.roomRaw = isHouseRoom(room) ? room : null;
    i.isOnList = r.ZISONLIST === 1;
    i.quantity = num(r.ZQUANTITY, 1);
    i.unitRaw = isMeasurementUnit(unit) ? unit : null;
    i.preferredQuantity = num(r.ZPREFERREDQUANTITY, 1);
    i.preferredUnitRaw = isMeasurementUnit(prefUnit) ? prefUnit : null;
    i.note = str(r.ZNOTE);
    i.forName = str(r.ZFORNAME);
    i.addedAt = coreDataDate(r.ZADDEDAT);
    i.snoozedUntil = coreDataDate(r.ZSNOOZEDUNTIL);
    i.addedBy = membersByPK.get(pk(r.ZADDEDBY) ?? -1) ?? null;
    i.assignedTo = membersByPK.get(pk(r.ZASSIGNEDTO) ?? -1) ?? null;
    i.forMember = membersByPK.get(pk(r.ZFORMEMBER) ?? -1) ?? null;
    i.customCategory = optionsByPK.get(pk(r.ZCUSTOMCATEGORY) ?? -1) ?? null;
    i.customRoom = optionsByPK.get(pk(r.ZCUSTOMROOM) ?? -1) ?? null;
    store.insertItem(i);
    const key = pk(r.Z_PK);
    if (key !== null) itemsByPK.set(key, i);
  }

  for (const r of list(rows.purchases)) {
    const hid = householdIDOf(r); const id = idOf(r);
    if (!hasHousehold(hid) || !id) continue;
    const unit = str(r.ZUNITRAW);
    const p = makePurchase(coreDataDate(r.ZPURCHASEDAT) ?? new Date(), num(r.ZQUANTITY, 1), isMeasurementUnit(unit) ? unit : null, strOrEmpty(r.ZORIGINDEVICEID), hid);
    p.id = id;
    store.insertPurchase(p);
    store.linkPurchase(p, itemsByPK.get(pk(r.ZITEM) ?? -1) ?? null, membersByPK.get(pk(r.ZMEMBER) ?? -1) ?? null);
  }

  for (const r of list(rows.tripTotals)) {
    const hid = householdIDOf(r); const id = idOf(r);
    if (!hasHousehold(hid) || !id) continue;
    const t = makeTripTotal({
      householdID: hid, tripKey: strOrEmpty(r.ZTRIPKEY), amount: num(r.ZAMOUNT, 0), currencyCode: strOrEmpty(r.ZCURRENCYCODE),
      storeName: str(r.ZSTORENAME), tripEndedAt: coreDataDate(r.ZTRIPENDEDAT) ?? new Date(), enteredBy: str(r.ZENTEREDBY),
      createdAt: coreDataDate(r.ZCREATEDAT) ?? new Date(),
    });
    t.id = id;
    store.insertTripTotal(t);
  }

  for (const p of store.allPurchases()) if (!p.item) store.deletePurchase(p);

  let recordCount = 0;
  const households = store.allHouseholds().map((h): LegacyHouseholdSnapshot => {
    const members = store.membersOf(h.id);
    const options = store.optionsOf(h.id);
    const items = store.itemsIn(h.id);
    const purchases = store.purchasesIn(h.id);
    const totals = store.tripTotalsIn(h.id);
    recordCount += 1 + members.length + options.length + items.length + purchases.length + totals.length;
    return {
      householdID: h.id, name: h.name, isOwnedByMe: owned.get(h.id) ?? false, ownerRecordName: h.ownerRecordName,
      household: householdDoc(h), banner: h.customImage,
      members: members.map((m) => ({ id: memberKey(m), data: memberDoc(m) })),
      options: options.map((o) => ({ id: o.id, data: optionDoc(o) })),
      items: items.map((i) => ({ id: i.id, data: itemDoc(i) })),
      purchases: purchases.map((p) => ({ id: p.id, data: purchaseDoc(p) })),
      tripTotals: totals.map((t) => ({ id: t.id, data: tripTotalDoc(t) })),
    };
  });
  return { households, recordCount };
}

// MARK: Wire format (Dates survive a JSON call as { __date: ms })

export function toWire(value: unknown): unknown {
  if (value instanceof Date) return { __date: value.getTime() };
  if (Array.isArray(value)) return value.map(toWire);
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value as Record<string, unknown>).map(([k, v]) => [k, toWire(v)]));
  return value;
}
