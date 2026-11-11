// Entity types. They mirror the Swift SwiftData models field for field. Relationships are
// held as direct object references (like SwiftData); `DataStore` keeps them consistent and
// applies the delete rules (nullify / cascade). Sync serialises them to ids.
//
// "User key" fields (`ownerRecordName`, `userRecordName`, `enteredBy`, `buyerKey`) are a
// stable id per person. For accounts created in Shopzyy it is the Firebase uid; for people
// migrated from the iOS app it stays their old CloudKit user record name, so every stored
// section key ("assignee:<key>"), trip key and total keeps working.

import type { HouseholdTheme, HouseRoom, ItemCategory, ListGrouping, MeasurementUnit } from './enums';

export interface UserProfile {
  name: string;
  emoji: string;
  colorHex: string;
}

export interface Household {
  id: string;
  name: string;
  createdAt: Date;
  /** User key of the person who created the household. */
  ownerRecordName: string;
  isOwnedByMe: boolean;
  groupingRaw: ListGrouping;
  /** Section keys in the household's preferred order; keys from every grouping live here. */
  sectionOrder: string[];
  themeRaw: HouseholdTheme;
  /** Banner photo (downscaled JPEG) as a data URI / storage URL, or null. */
  customImage: string | null;
  /** 0…1 from left / top; 0.5 is centred. */
  imageFocusX: number;
  imageFocusY: number;
  /** ISO 4217. Empty means "use the device's region". */
  currencyCode: string;
}

export interface HouseholdMember {
  id: string;
  householdID: string;
  userRecordName: string;
  name: string;
  emoji: string;
  colorHex: string;
  createdAt: Date;
}

export type OptionKind = 'category' | 'room';

export interface CustomOption {
  id: string;
  householdID: string;
  name: string;
  kindRaw: OptionKind;
  createdAt: Date;
}

export interface GroceryItem {
  id: string;
  householdID: string;
  name: string;
  /** Matching key from NameNormalizer. */
  normalizedName: string;
  categoryRaw: ItemCategory;
  roomRaw: HouseRoom | null;
  isOnList: boolean;
  quantity: number;
  unitRaw: MeasurementUnit | null;
  /** The amount last bought; used when re-added without a number. */
  preferredQuantity: number;
  preferredUnitRaw: MeasurementUnit | null;
  note: string | null;
  /** Who it's for when that person isn't a member. Ignored while `forMember` is set. */
  forName: string | null;
  addedAt: Date | null;
  snoozedUntil: Date | null;
  createdAt: Date;

  addedBy: HouseholdMember | null;
  assignedTo: HouseholdMember | null;
  forMember: HouseholdMember | null;
  customCategory: CustomOption | null;
  customRoom: CustomOption | null;
  /** Inverse of PurchaseRecord.item (cascade delete). Maintained by DataStore. */
  purchases: PurchaseRecord[];
}

export interface PurchaseRecord {
  id: string;
  householdID: string;
  purchasedAt: Date;
  quantity: number;
  unitRaw: MeasurementUnit | null;
  /** Which install created the record, so ActivityMonitor alerts only on remote purchases. */
  originDeviceID: string;
  item: GroceryItem | null;
  member: HouseholdMember | null;
}

export interface TripTotal {
  id: string;
  householdID: string;
  /** ShoppingTrip.id of the trip this belongs to. */
  tripKey: string;
  amount: number;
  currencyCode: string;
  storeName: string | null;
  tripEndedAt: Date;
  enteredBy: string | null;
  createdAt: Date;
}

export type Entity = Household | HouseholdMember | CustomOption | GroceryItem | PurchaseRecord | TripTotal;
