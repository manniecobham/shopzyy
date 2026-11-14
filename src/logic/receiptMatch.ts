import { fold } from '../lib/text';
import { NameNormalizer } from './NameNormalizer';
import type { ReceiptLine } from './receiptParser';

export interface ListCandidate { id: string; name: string }
export interface ReceiptMatch { itemID: string | null; score: number }

const FILLER = new Set(['kg', 'g', 'gr', 'ml', 'cl', 'l', 'x', 'pack', 'pk', 'pcs', 'st', 'bio', 'organic', 'fresh', 'the', 'of', 'and', 'de', 'la', 'le', 'el', 'het', 'een']);

const tokens = (name: string): string[] =>
  (fold(name).match(/\p{L}+/gu) ?? []).filter((w) => w.length >= 2 && !FILLER.has(w)).map(NameNormalizer.stem);

const sameToken = (a: string, b: string) => {
  if (a === b) return true;
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  return short.length >= 3 && long.startsWith(short);
};

export function matchScore(receiptName: string, listName: string): number {
  const r = tokens(receiptName);
  const l = tokens(listName);
  if (r.length === 0 || l.length === 0) return 0;
  const matched = l.filter((lt) => r.some((rt) => sameToken(lt, rt))).length;
  const cover = matched / l.length;
  if (cover < 0.66) return 0;
  const precision = Math.min(matched, r.length) / r.length;
  return 0.7 * cover + 0.3 * precision;
}

export function matchReceipt(lines: ReceiptLine[], candidates: ListCandidate[]): ReceiptMatch[] {
  const pairs: { line: number; item: number; score: number }[] = [];
  lines.forEach((line, li) => candidates.forEach((c, ci) => {
    const score = matchScore(line.name, c.name);
    if (score > 0) pairs.push({ line: li, item: ci, score });
  }));
  pairs.sort((a, b) => b.score - a.score);
  const result: ReceiptMatch[] = lines.map(() => ({ itemID: null, score: 0 }));
  const usedItems = new Set<number>();
  for (const p of pairs) {
    if (result[p.line].itemID !== null || usedItems.has(p.item)) continue;
    result[p.line] = { itemID: candidates[p.item].id, score: p.score };
    usedItems.add(p.item);
  }
  return result;
}
