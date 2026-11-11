// Built-in vocabularies. Raw values double as stored/synced field values, so
// never rename one (the iOS app and Firestore documents share them).

// MARK: ItemCategory -----------------------------------------------------------

/** Declared in the order you typically walk a supermarket, so `aisleOrder` is a route through the store. */
export const ITEM_CATEGORIES = [
  'produce', 'bakery', 'dairy', 'meat', 'seafood', 'pantry', 'frozen', 'beverages',
  'snacks', 'household', 'personalCare', 'baby', 'pets', 'other',
] as const;
export type ItemCategory = (typeof ITEM_CATEGORIES)[number];

const CATEGORY_INFO: Record<ItemCategory, { title: string; emoji: string }> = {
  produce: { title: 'Fruit & veg', emoji: '🥬' },
  bakery: { title: 'Bakery', emoji: '🥖' },
  dairy: { title: 'Dairy & eggs', emoji: '🧀' },
  meat: { title: 'Meat', emoji: '🥩' },
  seafood: { title: 'Fish & seafood', emoji: '🐟' },
  pantry: { title: 'Pantry', emoji: '🥫' },
  frozen: { title: 'Frozen', emoji: '🧊' },
  beverages: { title: 'Drinks', emoji: '🥤' },
  snacks: { title: 'Snacks', emoji: '🍿' },
  household: { title: 'Household', emoji: '🧻' },
  personalCare: { title: 'Personal care', emoji: '🧴' },
  baby: { title: 'Baby', emoji: '🍼' },
  pets: { title: 'Pets', emoji: '🐾' },
  other: { title: 'Other', emoji: '🛒' },
};

export const categoryTitle = (c: ItemCategory) => CATEGORY_INFO[c].title;
export const categoryEmoji = (c: ItemCategory) => CATEGORY_INFO[c].emoji;
export const aisleOrder = (c: ItemCategory) => ITEM_CATEGORIES.indexOf(c);
export const isItemCategory = (raw: string | null | undefined): raw is ItemCategory =>
  !!raw && (ITEM_CATEGORIES as readonly string[]).includes(raw);

// MARK: HouseRoom --------------------------------------------------------------

export const HOUSE_ROOMS = [
  'kitchen', 'livingRoom', 'diningRoom', 'bedroom', 'bathroom', 'kidsRoom',
  'office', 'laundry', 'garage', 'garden',
] as const;
export type HouseRoom = (typeof HOUSE_ROOMS)[number];

const ROOM_INFO: Record<HouseRoom, { title: string; emoji: string }> = {
  kitchen: { title: 'Kitchen', emoji: '🍳' },
  livingRoom: { title: 'Living room', emoji: '🛋️' },
  diningRoom: { title: 'Dining room', emoji: '🍽️' },
  bedroom: { title: 'Bedroom', emoji: '🛏️' },
  bathroom: { title: 'Bathroom', emoji: '🛁' },
  kidsRoom: { title: "Kids' room", emoji: '🧸' },
  office: { title: 'Office', emoji: '💼' },
  laundry: { title: 'Laundry', emoji: '🧺' },
  garage: { title: 'Garage', emoji: '🚗' },
  garden: { title: 'Garden', emoji: '🌿' },
};

export const roomTitle = (r: HouseRoom) => ROOM_INFO[r].title;
export const roomEmoji = (r: HouseRoom) => ROOM_INFO[r].emoji;
export const isHouseRoom = (raw: string | null | undefined): raw is HouseRoom =>
  !!raw && (HOUSE_ROOMS as readonly string[]).includes(raw);

// MARK: ListGrouping -----------------------------------------------------------

export const LIST_GROUPINGS = ['category', 'room', 'assignee', 'recipient'] as const;
export type ListGrouping = (typeof LIST_GROUPINGS)[number];

const GROUPING_INFO: Record<ListGrouping, { title: string; icon: string }> = {
  category: { title: 'Category', icon: 'grid-outline' },
  room: { title: 'Room', icon: 'home-outline' },
  assignee: { title: 'Assigned to', icon: 'person-circle-outline' },
  recipient: { title: "Who it's for", icon: 'gift-outline' },
};

export const groupingTitle = (g: ListGrouping) => GROUPING_INFO[g].title;
/** Ionicons name standing in for the SF Symbol the iOS app uses. */
export const groupingIcon = (g: ListGrouping) => GROUPING_INFO[g].icon;
export const isListGrouping = (raw: string | null | undefined): raw is ListGrouping =>
  !!raw && (LIST_GROUPINGS as readonly string[]).includes(raw);

// MARK: HouseholdTheme ---------------------------------------------------------

export const HOUSEHOLD_THEMES = ['none', 'sunny', 'calm', 'cozy', 'fresh', 'party', 'night'] as const;
export type HouseholdTheme = (typeof HOUSEHOLD_THEMES)[number];

const THEME_INFO: Record<HouseholdTheme, { title: string; emoji: string; colors: string[] }> = {
  none: { title: 'None', emoji: '', colors: [] }, // drawn with the screen's grouped background
  sunny: { title: 'Sunny', emoji: '☀️', colors: ['#FFD60A', '#FF9F0A'] },
  calm: { title: 'Calm', emoji: '🌊', colors: ['#64D2FF', '#0A84FF'] },
  cozy: { title: 'Cozy', emoji: '🕯️', colors: ['#E0A96D', '#8B5A3C'] },
  fresh: { title: 'Fresh', emoji: '🌿', colors: ['#A8E063', '#34C759'] },
  party: { title: 'Party', emoji: '🎉', colors: ['#FF6FD8', '#7F5AF0'] },
  night: { title: 'Night', emoji: '🌙', colors: ['#3A3F8F', '#141526'] },
};

export const themeTitle = (t: HouseholdTheme) => THEME_INFO[t].title;
export const themeEmoji = (t: HouseholdTheme) => THEME_INFO[t].emoji;
/** Gradient stops; empty for `none`, which uses the system grouped background. */
export const themeColors = (t: HouseholdTheme) => THEME_INFO[t].colors;
export const isHouseholdTheme = (raw: string | null | undefined): raw is HouseholdTheme =>
  !!raw && (HOUSEHOLD_THEMES as readonly string[]).includes(raw);

// MARK: MeasurementUnit --------------------------------------------------------

export const MEASUREMENT_UNITS = [
  'kilogram', 'gram', 'pound', 'ounce', 'liter', 'milliliter',
  'pack', 'bottle', 'can', 'bag', 'box', 'loaf', 'bunch', 'jar', 'carton', 'piece',
] as const;
export type MeasurementUnit = (typeof MEASUREMENT_UNITS)[number];
export const isMeasurementUnit = (raw: string | null | undefined): raw is MeasurementUnit =>
  !!raw && (MEASUREMENT_UNITS as readonly string[]).includes(raw);
