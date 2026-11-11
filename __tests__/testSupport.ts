import { SuggestionEngine, type PurchaseHistory } from '../src/logic/SuggestionEngine';
import { uuid } from '../src/lib/uuid';

/** A fixed Wednesday noon (UTC), so tests never depend on the real date. */
export const NOW = new Date(Date.UTC(2026, 2, 18, 12));

export const daysAgo = (days: number) => new Date(NOW.getTime() - days * 86_400_000);

export function history(
  name = 'Item',
  boughtDaysAgo: number[],
  opts: { onList?: boolean; snoozedUntil?: Date | null } = {},
): PurchaseHistory {
  return { itemID: uuid(), name, purchaseDates: boughtDaysAgo.map(daysAgo), isOnList: opts.onList ?? false, snoozedUntil: opts.snoozedUntil ?? null };
}

export const engine = () => new SuggestionEngine();
