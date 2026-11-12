
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
  ownerRecordName: string;
  isOwnedByMe: boolean;
  groupingRaw: ListGrouping;
  sectionOrder: string[];
  themeRaw: HouseholdTheme;
  customImage: string | null;
  imageFocusX: number;
  imageFocusY: number;
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
  normalizedName: string;
  categoryRaw: ItemCategory;
  roomRaw: HouseRoom | null;
  isOnList: boolean;
  quantity: number;
  unitRaw: MeasurementUnit | null;
  preferredQuantity: number;
  preferredUnitRaw: MeasurementUnit | null;
  note: string | null;
  forName: string | null;
  addedAt: Date | null;
  snoozedUntil: Date | null;
  createdAt: Date;

  addedBy: HouseholdMember | null;
  assignedTo: HouseholdMember | null;
  forMember: HouseholdMember | null;
  customCategory: CustomOption | null;
  customRoom: CustomOption | null;
  purchases: PurchaseRecord[];
}

export interface PurchaseRecord {
  id: string;
  householdID: string;
  purchasedAt: Date;
  quantity: number;
  unitRaw: MeasurementUnit | null;
  originDeviceID: string;
  startsTrip?: boolean;
  item: GroceryItem | null;
  member: HouseholdMember | null;
}

export interface TripTotal {
  id: string;
  householdID: string;
  tripKey: string;
  amount: number;
  currencyCode: string;
  storeName: string | null;
  tripEndedAt: Date;
  enteredBy: string | null;
  createdAt: Date;
}

export type Entity = Household | HouseholdMember | CustomOption | GroceryItem | PurchaseRecord | TripTotal;
