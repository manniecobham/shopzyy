import { charCount, fold } from '../lib/text';

const VOWELS = new Set(['a', 'e', 'i', 'o', 'u']);
const ends = (w: string, s: string) => w.endsWith(s);
const dropLast = (w: string, n = 1) => Array.from(w).slice(0, -n).join('');

/**
 * Produces a matching key so different spellings of one product collide:
 * "Tomatoes" / "tomato", "Strawberries" / "strawberry", "Café" / "cafe".
 * The key is a light stem, never shown to users ("berry" → "berri").
 */
export const NameNormalizer = {
  key(name: string): string {
    const tokens = fold(name).match(/[\p{L}\p{N}]+/gu) ?? [];
    return tokens.map(NameNormalizer.stem).join(' ');
  },

  /** Cleans user input for display: trims, collapses spaces, capitalises the first letter. */
  displayName(raw: string): string {
    const collapsed = raw
      .split(/\s+/)
      .filter(Boolean)
      .join(' ')
      .replace(/^[\p{P}\s]+|[\p{P}\s]+$/gu, '');
    const chars = Array.from(collapsed);
    if (chars.length === 0) return '';
    return chars[0].toUpperCase() + chars.slice(1).join('');
  },

  stem(word: string): string {
    const count = charCount(word);
    if (count <= 3) return word;

    if (count > 4 && ends(word, 'ies')) return dropLast(word, 2); // berries → berri
    if (ends(word, 'ie')) return dropLast(word); // cookie → cooki
    if (ends(word, 'y')) {
      const previous = Array.from(word).slice(0, -1).pop();
      if (previous !== undefined && !VOWELS.has(previous)) return dropLast(word) + 'i'; // berry → berri
    }
    for (const suffix of ['sses', 'ches', 'shes', 'xes', 'oes']) {
      if (ends(word, suffix)) return dropLast(word, 2); // tomatoes → tomato
    }
    if (ends(word, 'ss') || ends(word, 'us') || ends(word, 'is')) return word;
    if (ends(word, 's')) return dropLast(word); // eggs → egg
    return word;
  },
};
