import { fold } from '../lib/text';

export interface AutocompleteCandidate {
  id: string;
  name: string;
  popularity: number;
  isOnList: boolean;
}

/**
 * Ranks known items against a partial query: exact > prefix > word-prefix > substring,
 * nudged up by how often the household buys the item and down if already on the list.
 */
export function rankAutocomplete(query: string, candidates: AutocompleteCandidate[], limit = 6): AutocompleteCandidate[] {
  const needle = fold(query.trim());
  if (!needle) return [];

  const scored: [AutocompleteCandidate, number][] = [];
  for (const c of candidates) {
    const haystack = fold(c.name);
    let base: number;
    if (haystack === needle) base = 4;
    else if (haystack.startsWith(needle)) base = 3;
    else if (haystack.split(' ').some((w) => w !== '' && w.startsWith(needle))) base = 2;
    else if (haystack.includes(needle)) base = 1;
    else continue;
    scored.push([c, base + Math.log1p(c.popularity) * 0.5 - (c.isOnList ? 0.75 : 0)]);
  }
  return scored
    .sort((a, b) => (a[1] !== b[1] ? b[1] - a[1] : a[0].name < b[0].name ? -1 : a[0].name > b[0].name ? 1 : 0))
    .slice(0, limit)
    .map(([c]) => c);
}
