import { uuid } from '../lib/uuid';
import { NameNormalizer } from '../logic/NameNormalizer';
import type { ItemCategory, MeasurementUnit } from './enums';
import type {
  CustomOption, GroceryItem, Household, HouseholdMember, OptionKind, PurchaseRecord, TripTotal, UserProfile,
} from './entities';

export const MEMBER_PALETTE = ['#34C759', '#0A84FF', '#FF9F0A', '#BF5AF2', '#FF375F', '#64D2FF', '#FFD60A', '#AC8E68'];
export const EMOJI_CHOICES = ['🧑🏾', '👩🏾', '👨🏾', '🧔🏾', '👵🏾', '👴🏾', '👧🏾', '👦🏾', '🧑🏻', '👩🏼', '🧑🏽', '🐱'];

export const suggestedProfile = (name: string): UserProfile => ({ name, emoji: EMOJI_CHOICES[0], colorHex: MEMBER_PALETTE[0] });
export const sameProfile = (a: UserProfile, b: UserProfile) => a.name === b.name && a.emoji === b.emoji && a.colorHex === b.colorHex;

export function makeHousehold(p: Partial<Household> & Pick<Household, 'name' | 'ownerRecordName' | 'isOwnedByMe'>): Household {
  return {
    id: uuid(), createdAt: new Date(), groupingRaw: 'category', sectionOrder: [], themeRaw: 'sunny',
    customImage: null, imageFocusX: 0.5, imageFocusY: 0.5, currencyCode: '', ...p,
  };
}

export function makeMember(householdID: string, userRecordName: string, profile: UserProfile, createdAt = new Date()): HouseholdMember {
  return { id: uuid(), householdID, userRecordName, name: profile.name, emoji: profile.emoji, colorHex: profile.colorHex, createdAt };
}

export function makeOption(name: string, kind: OptionKind, householdID: string, createdAt = new Date()): CustomOption {
  return { id: uuid(), householdID, name, kindRaw: kind, createdAt };
}

export function makeItem(name: string, category: ItemCategory, householdID: string, createdAt = new Date()): GroceryItem {
  return {
    id: uuid(), householdID, name, normalizedName: NameNormalizer.key(name), categoryRaw: category, roomRaw: null,
    isOnList: false, quantity: 1, unitRaw: null, preferredQuantity: 1, preferredUnitRaw: null, note: null, forName: null,
    addedAt: null, snoozedUntil: null, createdAt,
    addedBy: null, assignedTo: null, forMember: null, customCategory: null, customRoom: null, purchases: [],
  };
}

export function makePurchase(
  purchasedAt: Date, quantity: number, unit: MeasurementUnit | null, originDeviceID: string, householdID: string,
): PurchaseRecord {
  return { id: uuid(), householdID, purchasedAt, quantity, unitRaw: unit, originDeviceID, item: null, member: null };
}

export function makeTripTotal(p: Omit<TripTotal, 'id' | 'createdAt'> & { createdAt?: Date }): TripTotal {
  return { id: uuid(), createdAt: new Date(), ...p };
}
