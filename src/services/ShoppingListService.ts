import { CategoryClassifier } from '../logic/CategoryClassifier';
import { NameNormalizer } from '../logic/NameNormalizer';
import { SmartItemParser, type ParsedItem } from '../logic/SmartItemParser';
import { SuggestionEngine } from '../logic/SuggestionEngine';
import { sameName } from '../lib/text';
import { builtIn, custom, type CategoryChoice, type RoomChoice } from '../models/choices';
import { HOUSE_ROOMS, ITEM_CATEGORIES, categoryTitle, categoryTitleEnglish, roomTitle, roomTitleEnglish, type MeasurementUnit } from '../models/enums';
import type { CustomOption, GroceryItem, HouseholdMember, OptionKind, PurchaseRecord } from '../models/entities';
import { makeItem, makeOption, makePurchase } from '../models/factories';
import {
  itemHistory, itemPreferredUnit, itemUnit, purchaseCount, putOnList, renameItem, setCategoryChoice,
  setRecipient, setRoomChoice, takeOffList, type ItemRecipient,
} from '../models/itemOps';
import type { ServiceEnv } from './ports';
import type { Entity } from '../models/entities';

const addDays = (d: Date, n: number) => { const r = new Date(d.getTime()); r.setDate(r.getDate() + n); return r; };

/**
 * The single place that mutates list state for one household. Screens call intent-level
 * methods ("mark bought") and never assemble model changes themselves, which keeps side
 * effects (history, sync, notifications, reminder rescheduling) consistent.
 */
export class ShoppingListService {
  constructor(
    private readonly env: ServiceEnv,
    readonly householdID: string,
    private readonly classifier = CategoryClassifier,
    private readonly engine = new SuggestionEngine(),
  ) {}

  private get store() { return this.env.store; }

  /** A service for whichever household owns `itemID`, e.g. to handle a notification action. */
  static forItem(itemID: string, env: ServiceEnv): ShoppingListService | null {
    const item = env.store.item(itemID);
    return item ? new ShoppingListService(env, item.householdID) : null;
  }

  /** False once the household was deleted or left on this device. */
  get isHouseholdAvailable(): boolean { return !this.store.removedHouseholds.has(this.householdID); }

  // MARK: Adding

  /** Parses free text ("2 kg rice, milk x2") and adds every item it finds. */
  addFromText(input: string, by: HouseholdMember | null, at: Date = new Date()): GroceryItem[] {
    if (!this.isHouseholdAvailable) return [];
    const items = SmartItemParser.parse(input).map((p) => this.add(p, by, at, false));
    this.save(items);
    return items;
  }

  /**
   * Reuses the catalog entry when the item is known, so history, category corrections and
   * usual quantity carry over. Re-adding something already on the list only changes it when a
   * quantity was typed explicitly.
   */
  add(parsed: ParsedItem, by: HouseholdMember | null, at: Date = new Date(), saving = true): GroceryItem {
    let item: GroceryItem;
    const existing = this.itemMatching(parsed.name);
    if (existing) {
      item = existing;
      if (existing.isOnList) {
        if (!parsed.hasExplicitQuantity) return existing;
        if (itemUnit(existing) === parsed.unit) {
          existing.quantity += parsed.quantity;
        } else {
          existing.quantity = parsed.quantity;
          existing.unitRaw = parsed.unit;
        }
      } else {
        putOnList(
          existing,
          parsed.hasExplicitQuantity ? parsed.quantity : existing.preferredQuantity,
          parsed.hasExplicitQuantity ? parsed.unit : itemPreferredUnit(existing),
          by,
          at,
        );
      }
    } else {
      item = makeItem(parsed.name, this.classifier.classify(parsed.name), this.householdID, at);
      this.store.insertItem(item);
      putOnList(item, parsed.quantity, parsed.unit, by, at);
    }
    if (saving) this.save([item]);
    return item;
  }

  addToList(itemID: string, by: HouseholdMember | null = null): void {
    if (!this.isHouseholdAvailable) return;
    const item = this.itemWithID(itemID);
    if (!item) return;
    if (!item.isOnList) putOnList(item, item.preferredQuantity, itemPreferredUnit(item), by ?? this.currentMember(), new Date());
    this.save([item]);
    this.refreshRestockReminders();
  }

  // MARK: Buying

  markBought(item: GroceryItem, by: HouseholdMember | null, at: Date = new Date()): void {
    if (!this.isHouseholdAvailable) return;
    const record = makePurchase(at, item.quantity, itemUnit(item), this.env.prefs.deviceID, this.householdID);
    this.store.insertPurchase(record);
    this.store.linkPurchase(record, item, by);

    item.preferredQuantity = item.quantity;
    item.preferredUnitRaw = itemUnit(item);
    takeOffList(item);
    this.save([record, item]);
    // No alert here: other members get one shopping-trip summary once this person has finished.
    this.refreshRestockReminders();
  }

  /** Reverses an accidental "bought": removes the record and restores the list entry. */
  undoPurchase(record: PurchaseRecord): void {
    if (!this.isHouseholdAvailable) return;
    const item = record.item;
    if (item && !item.isOnList) putOnList(item, record.quantity, record.unitRaw, record.member, new Date());
    this.env.sync?.delete([record]);
    this.store.deletePurchase(record);
    this.save(item ? [item] : []);
    this.refreshRestockReminders();
  }

  // MARK: Housekeeping

  removeFromList(item: GroceryItem): void {
    if (!this.isHouseholdAvailable) return;
    if (purchaseCount(item) === 0) {
      this.env.sync?.delete([item]); // Never bought: nothing worth remembering.
      this.store.deleteItem(item);
      this.save();
    } else {
      takeOffList(item); // Keep history so suggestions still learn.
      this.save([item]);
    }
  }

  snooze(itemID: string, days: number): void {
    if (!this.isHouseholdAvailable) return;
    const item = this.itemWithID(itemID);
    if (!item) return;
    item.snoozedUntil = addDays(new Date(), days);
    this.save([item]);
    this.refreshRestockReminders();
  }

  update(
    item: GroceryItem,
    f: {
      name: string; quantity: number; unit: MeasurementUnit | null; category: CategoryChoice; room: RoomChoice | null;
      note: string; assignedTo?: HouseholdMember | null; recipient?: ItemRecipient | null;
    },
  ): void {
    if (!this.isHouseholdAvailable) return;
    const cleanName = NameNormalizer.displayName(f.name);
    if (cleanName !== '' && cleanName !== item.name) renameItem(item, cleanName);
    item.quantity = Math.max(f.quantity, 0.01);
    item.unitRaw = f.unit;
    setCategoryChoice(item, f.category);
    setRoomChoice(item, f.room);
    item.note = f.note.trim() === '' ? null : f.note;
    item.assignedTo = f.assignedTo ?? null;
    setRecipient(item, f.recipient ?? null);
    this.save([item]);
  }

  // MARK: Custom categories and rooms

  /**
   * Returns the choice for a typed name, creating a custom option only when nothing matches.
   * Typing "kitchen" picks the built-in Kitchen, and an existing custom name is reused, so
   * the household never sees duplicates.
   */
  categoryChoiceNamed(name: string): CategoryChoice | null {
    if (!this.isHouseholdAvailable) return null;
    const clean = NameNormalizer.displayName(name);
    if (clean === '') return null;
    const builtInMatch = ITEM_CATEGORIES.find((c) => (sameName(categoryTitle(c), clean) || sameName(categoryTitleEnglish(c), clean)));
    if (builtInMatch) return builtIn(builtInMatch);
    return custom(this.customOption(clean, 'category'));
  }

  roomChoiceNamed(name: string): RoomChoice | null {
    if (!this.isHouseholdAvailable) return null;
    const clean = NameNormalizer.displayName(name);
    if (clean === '') return null;
    const builtInMatch = HOUSE_ROOMS.find((r) => (sameName(roomTitle(r), clean) || sameName(roomTitleEnglish(r), clean)));
    if (builtInMatch) return builtIn(builtInMatch);
    return custom(this.customOption(clean, 'room'));
  }

  deleteOption(option: CustomOption): void {
    if (!this.isHouseholdAvailable) return;
    const affected = this.store.itemsUsing(option); // Items lose the reference when the option goes, so they change too.
    this.env.sync?.delete([option]);
    this.store.deleteOption(option);
    this.save(affected);
  }

  private customOption(name: string, kind: OptionKind): CustomOption {
    const existing = this.store.optionsOf(this.householdID, kind).find((o) => sameName(o.name, name));
    if (existing) return existing;
    const option = this.store.insertOption(makeOption(name, kind, this.householdID));
    this.save([option]);
    return option;
  }

  refreshRestockReminders(): void {
    ShoppingListService.refreshRestockReminders(this.env, this.engine);
  }

  /** Reminders cover every household: scheduling replaces all pending ones. */
  static refreshRestockReminders(env: ServiceEnv, engine = new SuggestionEngine()): void {
    const forecasts = engine.forecasts(env.store.allItems().map(itemHistory));
    void env.notifier.scheduleRestockReminders(forecasts);
  }

  // MARK: Lookup

  itemMatching(name: string): GroceryItem | undefined {
    const key = NameNormalizer.key(name);
    return this.store.itemsIn(this.householdID).find((i) => i.normalizedName === key);
  }

  itemWithID(id: string): GroceryItem | undefined {
    const item = this.store.item(id);
    return item && item.householdID === this.householdID ? item : undefined;
  }

  /** The signed-in person's membership in this household. */
  currentMember(): HouseholdMember | null {
    const key = this.env.prefs.userRecordName;
    return key ? this.store.member(key, this.householdID) ?? null : null;
  }

  /** Commits locally, then schedules `changed` for upload. */
  private save(changed: Entity[] = []): void {
    this.store.commit();
    this.env.sync?.save(changed);
  }
}
