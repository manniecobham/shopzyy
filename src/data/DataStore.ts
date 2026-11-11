import type { CustomOption, Entity, GroceryItem, Household, HouseholdMember, OptionKind, PurchaseRecord, TripTotal } from '../models/entities';

export type EntityKind = 'household' | 'member' | 'option' | 'item' | 'purchase' | 'tripTotal';

/**
 * In-memory mirror of the Swift `ModelContext`: the single source of truth the UI reads.
 * Firestore (offline-persisted) is the sync layer and on-device cache behind it.
 * Relationship delete rules match SwiftData: items cascade to purchases; deleting a member or a
 * custom option nullifies the references to it.
 *
 * Mutations happen on the entity objects, then `commit()` notifies subscribers (a version
 * counter feeds `useSyncExternalStore`). Services call `commit()` where Swift called `context.save()`.
 */
export class DataStore {
  private households = new Map<string, Household>();
  private members = new Map<string, HouseholdMember>();
  private options = new Map<string, CustomOption>();
  private items = new Map<string, GroceryItem>();
  private purchases = new Map<string, PurchaseRecord>();
  private totals = new Map<string, TripTotal>();
  private kinds = new WeakMap<object, EntityKind>();
  private listeners = new Set<() => void>();
  private _version = 0;

  /** Households removed from this device this session; services refuse changes to them. */
  readonly removedHouseholds = new Set<string>();

  // MARK: Observation

  get version(): number { return this._version; }
  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
  getSnapshot = (): number => this._version;
  /** Equivalent of `context.save()`: tells observers something changed. */
  commit(): void {
    this._version++;
    this.listeners.forEach((l) => l());
  }

  kindOf(entity: Entity): EntityKind | undefined { return this.kinds.get(entity); }

  // MARK: Insert

  insertHousehold(h: Household): Household { this.households.set(h.id, h); this.kinds.set(h, 'household'); return h; }
  insertMember(m: HouseholdMember): HouseholdMember { this.members.set(m.id, m); this.kinds.set(m, 'member'); return m; }
  insertOption(o: CustomOption): CustomOption { this.options.set(o.id, o); this.kinds.set(o, 'option'); return o; }
  insertItem(i: GroceryItem): GroceryItem { this.items.set(i.id, i); this.kinds.set(i, 'item'); return i; }
  insertTripTotal(t: TripTotal): TripTotal { this.totals.set(t.id, t); this.kinds.set(t, 'tripTotal'); return t; }
  insertPurchase(p: PurchaseRecord): PurchaseRecord {
    this.purchases.set(p.id, p);
    this.kinds.set(p, 'purchase');
    if (p.item && !p.item.purchases.includes(p)) p.item.purchases.push(p);
    return p;
  }

  /** Sets a purchase's item and member, keeping the item's inverse list in step. */
  linkPurchase(p: PurchaseRecord, item: GroceryItem | null, member: HouseholdMember | null): void {
    if (p.item && p.item !== item) p.item.purchases = p.item.purchases.filter((x) => x !== p);
    p.item = item;
    p.member = member;
    if (item && !item.purchases.includes(p)) item.purchases.push(p);
  }

  // MARK: Fetch

  allHouseholds(): Household[] { return [...this.households.values()].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()); }
  household(id: string): Household | undefined { return this.households.get(id); }
  allItems(): GroceryItem[] { return [...this.items.values()]; }
  item(id: string): GroceryItem | undefined { return this.items.get(id); }
  allMembers(): HouseholdMember[] { return [...this.members.values()]; }
  allOptions(): CustomOption[] { return [...this.options.values()]; }
  allPurchases(): PurchaseRecord[] { return [...this.purchases.values()]; }
  allTripTotals(): TripTotal[] { return [...this.totals.values()]; }
  purchase(id: string): PurchaseRecord | undefined { return this.purchases.get(id); }
  tripTotal(id: string): TripTotal | undefined { return this.totals.get(id); }
  memberByID(id: string): HouseholdMember | undefined { return this.members.get(id); }
  optionByID(id: string): CustomOption | undefined { return this.options.get(id); }

  itemsIn(householdID: string): GroceryItem[] { return this.allItems().filter((i) => i.householdID === householdID); }
  membersOf(householdID: string): HouseholdMember[] {
    return this.allMembers().filter((m) => m.householdID === householdID).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }
  member(userRecordName: string, householdID: string): HouseholdMember | undefined {
    return this.allMembers().find((m) => m.householdID === householdID && m.userRecordName === userRecordName);
  }
  optionsOf(householdID: string, kind?: OptionKind): CustomOption[] {
    return this.allOptions().filter((o) => o.householdID === householdID && (kind === undefined || o.kindRaw === kind));
  }
  purchasesIn(householdID: string): PurchaseRecord[] { return this.allPurchases().filter((p) => p.householdID === householdID); }
  tripTotalsIn(householdID: string): TripTotal[] { return this.allTripTotals().filter((t) => t.householdID === householdID); }
  tripTotalFor(householdID: string, tripKey: string): TripTotal | undefined {
    return this.allTripTotals().find((t) => t.householdID === householdID && t.tripKey === tripKey);
  }

  /** Items that use `option` as their custom category / room. */
  itemsUsing(option: CustomOption): GroceryItem[] {
    return this.allItems().filter((i) => i.customCategory === option || i.customRoom === option);
  }
  itemCount(option: CustomOption): number {
    return this.allItems().filter((i) => (option.kindRaw === 'category' ? i.customCategory : i.customRoom) === option).length;
  }

  // MARK: Delete (SwiftData delete rules)

  deleteItem(item: GroceryItem): void {
    for (const p of [...item.purchases]) this.purchases.delete(p.id); // cascade
    item.purchases = [];
    this.items.delete(item.id);
  }

  deletePurchase(p: PurchaseRecord): void {
    if (p.item) p.item.purchases = p.item.purchases.filter((x) => x !== p);
    this.purchases.delete(p.id);
  }

  deleteMember(m: HouseholdMember): void { // nullify
    for (const i of this.items.values()) {
      if (i.addedBy === m) i.addedBy = null;
      if (i.assignedTo === m) i.assignedTo = null;
      if (i.forMember === m) i.forMember = null;
    }
    for (const p of this.purchases.values()) if (p.member === m) p.member = null;
    this.members.delete(m.id);
  }

  deleteOption(o: CustomOption): void { // nullify
    for (const i of this.items.values()) {
      if (i.customCategory === o) i.customCategory = null;
      if (i.customRoom === o) i.customRoom = null;
    }
    this.options.delete(o.id);
  }

  deleteTripTotal(t: TripTotal): void { this.totals.delete(t.id); }
  deleteHousehold(h: Household): void { this.households.delete(h.id); }

  /** Everything in one household, e.g. when it's deleted or left. */
  deleteHouseholdData(householdID: string): void {
    for (const p of this.purchasesIn(householdID)) this.purchases.delete(p.id);
    for (const i of this.itemsIn(householdID)) this.items.delete(i.id);
    for (const o of this.optionsOf(householdID)) this.options.delete(o.id);
    for (const t of this.tripTotalsIn(householdID)) this.totals.delete(t.id);
    for (const m of this.membersOf(householdID)) this.members.delete(m.id);
    this.households.delete(householdID);
  }

  eraseEverything(): void {
    this.purchases.clear(); this.items.clear(); this.options.clear();
    this.totals.clear(); this.members.clear(); this.households.clear();
  }

  isLiveHousehold(id: string): boolean { return !this.removedHouseholds.has(id) && this.households.has(id); }
}
