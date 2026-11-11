import { type MeasurementUnit, unitFromToken } from '../models/enums';
import { NameNormalizer } from './NameNormalizer';

export interface ParsedItem {
  name: string;
  quantity: number;
  unit: MeasurementUnit | null;
  /** False when no number was typed, so callers can fall back to the item's usual quantity. */
  hasExplicitQuantity: boolean;
}

const NUMBER_WORDS: Record<string, number> = {
  a: 1, an: 1, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8,
  nine: 9, ten: 10, eleven: 11, twelve: 12, half: 0.5, dozen: 12,
};
const FILLER_WORDS = new Set(['of', 'some']);
const MULTIPLIER_MARKERS = ['x', '×'];

function number(text: string): number | null {
  const t = text.replace(/,/g, '.');
  if (t === '') return null;
  const value = Number(t);
  return Number.isFinite(value) && value > 0 ? value : null;
}

/** "3", "1.5", "500g", "2kg", "2x", "two", "a" */
function leadingQuantity(token: string): { value: number; unit: MeasurementUnit | null } | null {
  const lower = token.toLowerCase();
  if (Object.prototype.hasOwnProperty.call(NUMBER_WORDS, lower)) return { value: NUMBER_WORDS[lower], unit: null };

  const digits = /^[0-9.,]*/.exec(lower)![0];
  if (!digits) return null;
  const value = number(digits);
  if (value === null) return null;

  const suffix = lower.slice(digits.length);
  if (suffix === '' || MULTIPLIER_MARKERS.includes(suffix)) return { value, unit: null };
  const unit = unitFromToken(suffix);
  return unit ? { value, unit } : null;
}

/** "x3", "×3", "3x" as the last word, or "x 3" as the last two. Mutates `words`. */
function trailingMultiplier(words: string[]): number | null {
  if (words.length <= 1) return null;
  const last = words[words.length - 1].toLowerCase();
  for (const marker of MULTIPLIER_MARKERS) {
    if (last.startsWith(marker)) {
      const v = number(last.slice(marker.length));
      if (v !== null) { words.pop(); return v; }
    }
    if (last.endsWith(marker)) {
      const v = number(last.slice(0, last.length - marker.length));
      if (v !== null) { words.pop(); return v; }
    }
  }
  if (words.length > 2 && MULTIPLIER_MARKERS.includes(words[words.length - 2].toLowerCase())) {
    const v = number(last);
    if (v !== null) { words.splice(-2, 2); return v; }
  }
  return null;
}

/**
 * Turns free text into structured items:
 *   "2 kg chicken breast, milk x2; a dozen eggs" → [2 kg Chicken breast] [2 × Milk] [12 × Eggs]
 * Items are separated by commas, semicolons, new lines or "+". "and" is deliberately
 * not a separator, so "mac and cheese" stays one item.
 */
export const SmartItemParser = {
  parse(input: string): ParsedItem[] {
    return input
      .split(/[,;\n+]/)
      .map(SmartItemParser.parseSegment)
      .filter((p): p is ParsedItem => p !== null);
  },

  parseSegment(segment: string): ParsedItem | null {
    const words = segment.split(/\s+/).filter(Boolean);
    let quantity: number | null = null;
    let unit: MeasurementUnit | null = null;

    const leading = words.length > 1 ? leadingQuantity(words[0]) : null;
    if (leading) {
      const value = leading.value;
      quantity = value;
      unit = leading.unit;
      words.shift();

      if (words.length > 1 && words[0].toLowerCase() === 'dozen') { // "2 dozen eggs"
        quantity = value * 12;
        words.shift();
      }
      if (unit === null && words.length > 1) { // "2 kg rice"
        const spaced = unitFromToken(words[0]);
        if (spaced) { unit = spaced; words.shift(); }
      }
      if (words.length > 1 && FILLER_WORDS.has(words[0].toLowerCase())) words.shift(); // "2 bottles of wine"
    } else {
      const trailing = trailingMultiplier(words); // "milk x2"
      if (trailing !== null) quantity = trailing;
    }

    const name = NameNormalizer.displayName(words.join(' '));
    if (name === '' || number(name) !== null) return null;
    return { name, quantity: quantity ?? 1, unit, hasExplicitQuantity: quantity !== null };
  },
};
