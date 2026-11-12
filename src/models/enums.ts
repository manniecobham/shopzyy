
import { t } from '../i18n';

const tx = (s: string) => s;

// MARK: ItemCategory -----------------------------------------------------------

export const ITEM_CATEGORIES = [
  'produce', 'bakery', 'dairy', 'meat', 'seafood', 'pantry', 'frozen', 'beverages',
  'snacks', 'household', 'personalCare', 'baby', 'pets', 'other',
] as const;
export type ItemCategory = (typeof ITEM_CATEGORIES)[number];

const CATEGORY_INFO: Record<ItemCategory, { title: string; emoji: string }> = {
  produce: { title: tx('Fruit & veg'), emoji: '🥬' },
  bakery: { title: tx('Bakery'), emoji: '🥖' },
  dairy: { title: tx('Dairy & eggs'), emoji: '🧀' },
  meat: { title: tx('Meat'), emoji: '🥩' },
  seafood: { title: tx('Fish & seafood'), emoji: '🐟' },
  pantry: { title: tx('Pantry'), emoji: '🥫' },
  frozen: { title: tx('Frozen'), emoji: '🧊' },
  beverages: { title: tx('Drinks'), emoji: '🥤' },
  snacks: { title: tx('Snacks'), emoji: '🍿' },
  household: { title: tx('Household'), emoji: '🧻' },
  personalCare: { title: tx('Personal care'), emoji: '🧴' },
  baby: { title: tx('Baby'), emoji: '🍼' },
  pets: { title: tx('Pets'), emoji: '🐾' },
  other: { title: tx('Other'), emoji: '🛒' },
};

export const categoryTitle = (c: ItemCategory) => t(CATEGORY_INFO[c].title);
export const categoryTitleEnglish = (c: ItemCategory) => CATEGORY_INFO[c].title;
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
  kitchen: { title: tx('Kitchen'), emoji: '🍳' },
  livingRoom: { title: tx('Living room'), emoji: '🛋️' },
  diningRoom: { title: tx('Dining room'), emoji: '🍽️' },
  bedroom: { title: tx('Bedroom'), emoji: '🛏️' },
  bathroom: { title: tx('Bathroom'), emoji: '🛁' },
  kidsRoom: { title: tx("Kids' room"), emoji: '🧸' },
  office: { title: tx('Office'), emoji: '💼' },
  laundry: { title: tx('Laundry'), emoji: '🧺' },
  garage: { title: tx('Garage'), emoji: '🚗' },
  garden: { title: tx('Garden'), emoji: '🌿' },
};

export const roomTitle = (r: HouseRoom) => t(ROOM_INFO[r].title);
export const roomTitleEnglish = (r: HouseRoom) => ROOM_INFO[r].title;
export const roomEmoji = (r: HouseRoom) => ROOM_INFO[r].emoji;
export const isHouseRoom = (raw: string | null | undefined): raw is HouseRoom =>
  !!raw && (HOUSE_ROOMS as readonly string[]).includes(raw);

// MARK: ListGrouping -----------------------------------------------------------

export const LIST_GROUPINGS = ['category', 'room', 'assignee', 'recipient'] as const;
export type ListGrouping = (typeof LIST_GROUPINGS)[number];

type GroupingSymbol = 'square.grid.2x2' | 'house' | 'person.crop.circle.badge.checkmark' | 'gift';
const GROUPING_INFO: Record<ListGrouping, { title: string; icon: GroupingSymbol }> = {
  category: { title: tx('Category'), icon: 'square.grid.2x2' },
  room: { title: tx('Room'), icon: 'house' },
  assignee: { title: tx('Assigned to'), icon: 'person.crop.circle.badge.checkmark' },
  recipient: { title: tx("Who it's for"), icon: 'gift' },
};

export const groupingTitle = (g: ListGrouping) => t(GROUPING_INFO[g].title);
export const groupingIcon = (g: ListGrouping) => GROUPING_INFO[g].icon;
export const isListGrouping = (raw: string | null | undefined): raw is ListGrouping =>
  !!raw && (LIST_GROUPINGS as readonly string[]).includes(raw);

// MARK: HouseholdTheme ---------------------------------------------------------

export const HOUSEHOLD_THEMES = ['none', 'sunny', 'calm', 'cozy', 'fresh', 'party', 'night'] as const;
export type HouseholdTheme = (typeof HOUSEHOLD_THEMES)[number];

const THEME_INFO: Record<HouseholdTheme, { title: string; emoji: string; colors: string[] }> = {
  none: { title: tx('None'), emoji: '', colors: [] }, // drawn with the screen's grouped background
  sunny: { title: tx('Sunny'), emoji: '☀️', colors: ['#FFD60A', '#FF9F0A'] },
  calm: { title: tx('Calm'), emoji: '🌊', colors: ['#64D2FF', '#0A84FF'] },
  cozy: { title: tx('Cozy'), emoji: '🕯️', colors: ['#E0A96D', '#8B5A3C'] },
  fresh: { title: tx('Fresh'), emoji: '🌿', colors: ['#A8E063', '#34C759'] },
  party: { title: tx('Party'), emoji: '🎉', colors: ['#FF6FD8', '#7F5AF0'] },
  night: { title: tx('Night'), emoji: '🌙', colors: ['#3A3F8F', '#141526'] },
};

export const themeTitle = (theme: HouseholdTheme) => t(THEME_INFO[theme].title);
export const themeEmoji = (theme: HouseholdTheme) => THEME_INFO[theme].emoji;
export const themeColors = (theme: HouseholdTheme) => THEME_INFO[theme].colors;
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

const UNIT_ALIASES: Record<string, MeasurementUnit> = {};
{
  const table: Record<MeasurementUnit, string[]> = {
    kilogram: ['kg', 'kgs', 'kilo', 'kilos', 'kilogram', 'kilograms'],
    gram: ['g', 'gr', 'grs', 'gram', 'grams'],
    pound: ['lb', 'lbs', 'pound', 'pounds'],
    ounce: ['oz', 'ounce', 'ounces'],
    liter: ['l', 'lt', 'ltr', 'liter', 'liters', 'litre', 'litres'],
    milliliter: ['ml', 'milliliter', 'milliliters', 'millilitre', 'millilitres'],
    pack: ['pack', 'packs', 'pk', 'pkt', 'packet', 'packets'],
    bottle: ['bottle', 'bottles', 'btl'],
    can: ['can', 'cans', 'tin', 'tins'],
    bag: ['bag', 'bags'],
    box: ['box', 'boxes'],
    loaf: ['loaf', 'loaves'],
    bunch: ['bunch', 'bunches'],
    jar: ['jar', 'jars'],
    carton: ['carton', 'cartons', 'crate', 'crates'],
    piece: ['pc', 'pcs', 'piece', 'pieces'],
  };
  for (const unit of MEASUREMENT_UNITS) for (const word of table[unit]) UNIT_ALIASES[word] = unit;
}

export function unitFromToken(token: string): MeasurementUnit | null {
  const key = token.toLowerCase().replace(/^[\p{P}\s]+|[\p{P}\s]+$/gu, '');
  return Object.prototype.hasOwnProperty.call(UNIT_ALIASES, key) ? UNIT_ALIASES[key] : null;
}

const MEASURED: readonly MeasurementUnit[] = ['kilogram', 'gram', 'pound', 'ounce', 'liter', 'milliliter'];
const isMeasured = (u: MeasurementUnit) => MEASURED.includes(u);

export function unitInputToken(u: MeasurementUnit): string {
  switch (u) {
    case 'kilogram': return 'kg';
    case 'gram': return 'g';
    case 'pound': return 'lb';
    case 'ounce': return 'oz';
    case 'liter': return 'l';
    case 'milliliter': return 'ml';
    default: return u;
  }
}

const UNIT_WORDS: Record<MeasurementUnit, { one: string; many: string }> = {
  kilogram: { one: tx('kg'), many: tx('kg') }, gram: { one: tx('g'), many: tx('g') }, pound: { one: tx('lb'), many: tx('lb') },
  ounce: { one: tx('oz'), many: tx('oz') }, liter: { one: tx('L'), many: tx('L') }, milliliter: { one: tx('mL'), many: tx('mL') },
  pack: { one: tx('pack'), many: tx('packs') }, bottle: { one: tx('bottle'), many: tx('bottles') }, can: { one: tx('can'), many: tx('cans') },
  bag: { one: tx('bag'), many: tx('bags') }, box: { one: tx('box'), many: tx('boxes') }, loaf: { one: tx('loaf'), many: tx('loaves') },
  bunch: { one: tx('bunch'), many: tx('bunches') }, jar: { one: tx('jar'), many: tx('jars') }, carton: { one: tx('carton'), many: tx('cartons') },
  piece: { one: tx('piece'), many: tx('pieces') },
};

export function unitLabel(u: MeasurementUnit): string {
  switch (u) {
    case 'kilogram': return 'kg';
    case 'gram': return 'g';
    case 'pound': return 'lb';
    case 'ounce': return 'oz';
    case 'liter': return 'L';
    case 'milliliter': return 'mL';
    default: return t(UNIT_WORDS[u].one);
  }
}

function pluralLabel(u: MeasurementUnit, quantity: number): string {
  if (isMeasured(u) || quantity === 1) return unitLabel(u);
  return t(UNIT_WORDS[u].many);
}

export function plainQuantity(value: number): string {
  if (Math.round(value) === value && Math.abs(value) < 1_000_000) return String(Math.trunc(value));
  return value.toFixed(2).replace(/\.?0+$/, '');
}

export function describeQuantity(quantity: number, unit: MeasurementUnit | null | undefined): string | null {
  const number = plainQuantity(quantity);
  if (!unit || unit === 'piece') return quantity === 1 ? null : `×${number}`;
  return `${number} ${pluralLabel(unit, quantity)}`;
}
