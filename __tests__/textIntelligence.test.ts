import { CategoryClassifier } from '../src/logic/CategoryClassifier';
import { DayPhrase } from '../src/logic/DayPhrase';
import { rankAutocomplete, type AutocompleteCandidate } from '../src/logic/AutocompleteRanker';
import { NameNormalizer } from '../src/logic/NameNormalizer';
import { describeQuantity } from '../src/models/enums';
import { uuid } from '../src/lib/uuid';

describe('NameNormalizer', () => {
  test('singular and plural share a key', () => {
    const pairs = [['Tomatoes', 'tomato'], ['Strawberries', 'strawberry'], ['cookies', 'Cookie'], ['Eggs', 'egg'], ['boxes', 'box'], ['Glasses', 'glass'], ['Peaches', 'peach']];
    for (const [plural, singular] of pairs) {
      expect(NameNormalizer.key(plural)).toBe(NameNormalizer.key(singular));
    }
  });
  test('key ignores case, accents and punctuation', () => {
    expect(NameNormalizer.key('Crème  Fraîche!')).toBe(NameNormalizer.key('creme fraiche'));
  });
  test('words ending in s are not over-stemmed', () => {
    expect(NameNormalizer.key('hummus')).toBe('hummus');
    expect(NameNormalizer.key('gas')).toBe('gas');
  });
  test('displayName tidies input', () => {
    expect(NameNormalizer.displayName('  green   beans. ')).toBe('Green beans');
  });
});

describe('CategoryClassifier', () => {
  const c = CategoryClassifier;
  test('common items', () => {
    expect(c.classify('Whole milk')).toBe('dairy');
    expect(c.classify('Strawberries')).toBe('produce');
    expect(c.classify('Chicken breast')).toBe('meat');
    expect(c.classify('Toilet paper')).toBe('household');
    expect(c.classify('Basmati rice')).toBe('pantry');
  });
  test('longest keyword wins', () => {
    expect(c.classify('Peanut butter')).toBe('pantry');
    expect(c.classify('Vanilla ice cream')).toBe('frozen');
    expect(c.classify('Tomato paste')).toBe('pantry');
  });
  test('keywords match whole words only', () => {
    expect(c.classify('Rice')).toBe('pantry');
    expect(c.classify('Watermelon')).toBe('produce');
  });
  test('unknown items fall back to other', () => {
    expect(c.classify('Birthday candles')).toBe('other');
  });
});

describe('AutocompleteRanker', () => {
  const cand = (name: string, popularity = 0, isOnList = false): AutocompleteCandidate => ({ id: uuid(), name, popularity, isOnList });
  test('prefix beats substring', () => {
    expect(rankAutocomplete('mil', [cand('Oat milk'), cand('Milk')]).map((c) => c.name)).toEqual(['Milk', 'Oat milk']);
  });
  test('popularity breaks ties', () => {
    expect(rankAutocomplete('ch', [cand('Cheddar', 1), cand('Chicken', 20)])[0].name).toBe('Chicken');
  });
  test('non-matches and empty queries return nothing', () => {
    expect(rankAutocomplete('zz', [cand('Milk')])).toEqual([]);
    expect(rankAutocomplete(' ', [cand('Milk')])).toEqual([]);
  });
});

describe('Formatting', () => {
  test('quantity descriptions', () => {
    expect(describeQuantity(1, null)).toBeNull();
    expect(describeQuantity(3, null)).toBe('×3');
    expect(describeQuantity(1.5, 'kilogram')).toBe('1.5 kg');
    expect(describeQuantity(2, 'bottle')).toBe('2 bottles');
    expect(describeQuantity(2, 'loaf')).toBe('2 loaves');
  });
  test('cadence phrases', () => {
    expect(DayPhrase.cadence(7)).toBe('weekly');
    expect(DayPhrase.cadence(4)).toBe('every 4 days');
    expect(DayPhrase.cadence(30)).toBe('monthly');
    expect(DayPhrase.ago(1)).toBe('yesterday');
  });
});
