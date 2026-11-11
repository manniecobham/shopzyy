import { ITEM_CATEGORIES, HOUSE_ROOMS, aisleOrder, categoryEmoji, categoryTitle, roomEmoji, roomTitle, type HouseRoom, type ItemCategory } from './enums';
import type { CustomOption } from './entities';

/** A built-in value or one the household created. Selection and list-section key. */
export type OptionChoice<B> = { kind: 'builtIn'; value: B } | { kind: 'custom'; option: CustomOption };
export type CategoryChoice = OptionChoice<ItemCategory>;
export type RoomChoice = OptionChoice<HouseRoom>;

export const CUSTOM_EMOJI = { category: '🏷️', room: '🚪' } as const;

export const builtIn = <B>(value: B): OptionChoice<B> => ({ kind: 'builtIn', value });
export const custom = <B>(option: CustomOption): OptionChoice<B> => ({ kind: 'custom', option });

export function sameChoice<B>(a: OptionChoice<B> | null | undefined, b: OptionChoice<B> | null | undefined): boolean {
  if (!a || !b) return a === b || (!a && !b);
  if (a.kind === 'builtIn' && b.kind === 'builtIn') return a.value === b.value;
  if (a.kind === 'custom' && b.kind === 'custom') return a.option.id === b.option.id;
  return false;
}

export const categoryChoiceTitle = (c: CategoryChoice) => (c.kind === 'builtIn' ? categoryTitle(c.value) : c.option.name);
export const categoryChoiceEmoji = (c: CategoryChoice) => (c.kind === 'builtIn' ? categoryEmoji(c.value) : CUSTOM_EMOJI.category);
export const categoryChoiceLabel = (c: CategoryChoice) => `${categoryChoiceEmoji(c)}  ${categoryChoiceTitle(c)}`;

export const roomChoiceTitle = (c: RoomChoice) => (c.kind === 'builtIn' ? roomTitle(c.value) : c.option.name);
export const roomChoiceEmoji = (c: RoomChoice) => (c.kind === 'builtIn' ? roomEmoji(c.value) : CUSTOM_EMOJI.room);
export const roomChoiceLabel = (c: RoomChoice) => `${roomChoiceEmoji(c)}  ${roomChoiceTitle(c)}`;

/** Store-walking order: built-in aisles first, the household's own next, "Other" last. */
export function categorySortRank(c: CategoryChoice): number {
  if (c.kind === 'custom') return ITEM_CATEGORIES.length - 1;
  return c.value === 'other' ? ITEM_CATEGORIES.length : aisleOrder(c.value);
}

export { HOUSE_ROOMS };
