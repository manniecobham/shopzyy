import { t, tn } from '../i18n';

export interface TripPurchase {
  id: string;
  itemName: string;
  quantityText?: string | null;
  purchasedAt: Date;
}

export const DISTANT_PAST = new Date(-62_135_769_600_000);

export const TRIP_MAX_GAP_MS = 60 * 60 * 1000;
export const TRIP_QUIET_PERIOD_MS = 5 * 60 * 1000;

export class ShoppingTrip {
  constructor(
    readonly householdID: string,
    readonly buyerKey: string | null,
    readonly buyerName: string,
    readonly purchases: TripPurchase[],
  ) {}

  get start(): Date { return this.purchases[0]?.purchasedAt ?? DISTANT_PAST; }
  get end(): Date { return this.purchases[this.purchases.length - 1]?.purchasedAt ?? DISTANT_PAST; }

  get id(): string {
    return `${this.householdID}.${this.buyerKey ?? 'someone'}.${Math.trunc(this.start.getTime() / 1000)}`;
  }

  get announceAt(): Date { return new Date(this.end.getTime() + TRIP_QUIET_PERIOD_MS); }

  get promptDelay(): number {
    const gaps: number[] = [];
    for (let i = 1; i < this.purchases.length; i++) {
      const g = (this.purchases[i].purchasedAt.getTime() - this.purchases[i - 1].purchasedAt.getTime()) / 1000;
      if (g <= 120) gaps.push(g);
    }
    gaps.sort((a, b) => a - b);
    if (gaps.length === 0) return 30;
    return Math.min(Math.max(gaps[Math.floor(gaps.length / 2)] * 3, 15), 45);
  }

  get promptAt(): Date { return new Date(this.end.getTime() + this.promptDelay * 1000); }

  get title(): string { return t('{name} went shopping', { name: this.buyerName }); }

  body(maxNames = 3, total: string | null = null): string {
    const names = this.purchases.map((p) => p.itemName);
    const count = tn('{n} item', '{n} items', names.length);
    const shown = names.slice(0, maxNames).join(', ');
    const rest = names.length - Math.min(names.length, maxNames);
    const summary = rest > 0 ? t('{count} · {shown} and {rest} more', { count, shown, rest }) : `${count} · ${shown}`;
    return total ? `${summary} · ${total}` : summary;
  }

  static group(entries: { householdID: string; buyerKey: string | null; buyerName: string; purchase: TripPurchase }[]): ShoppingTrip[] {
    const byBuyer = new Map<string, typeof entries>();
    for (const e of entries) {
      const key = `${e.householdID}|${e.buyerKey ?? ''}`;
      const list = byBuyer.get(key);
      if (list) list.push(e); else byBuyer.set(key, [e]);
    }

    const trips: ShoppingTrip[] = [];
    for (const list of byBuyer.values()) {
      const sorted = [...list].sort((a, b) => a.purchase.purchasedAt.getTime() - b.purchase.purchasedAt.getTime());
      let current: TripPurchase[] = [];
      for (const e of sorted) {
        const last = current[current.length - 1];
        if (last && e.purchase.purchasedAt.getTime() - last.purchasedAt.getTime() > TRIP_MAX_GAP_MS) {
          trips.push(new ShoppingTrip(e.householdID, e.buyerKey, e.buyerName, current));
          current = [];
        }
        current.push(e.purchase);
      }
      if (sorted.length > 0 && current.length > 0) {
        const f = sorted[0];
        trips.push(new ShoppingTrip(f.householdID, f.buyerKey, f.buyerName, current));
      }
    }
    return trips.sort((a, b) => a.start.getTime() - b.start.getTime());
  }
}
