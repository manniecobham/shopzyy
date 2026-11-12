import { SmartItemParser, type ParsedItem } from '../src/logic/SmartItemParser';

function single(input: string): ParsedItem {
  const items = SmartItemParser.parse(input);
  expect(items).toHaveLength(1);
  return items[0];
}

describe('SmartItemParser', () => {
  test('plain name', () => {
    expect(single('bread')).toEqual({ name: 'Bread', quantity: 1, unit: null, hasExplicitQuantity: false });
  });
  test('leading quantity and spaced unit', () => {
    expect(single('2 kg chicken breast')).toEqual({ name: 'Chicken breast', quantity: 2, unit: 'kilogram', hasExplicitQuantity: true });
  });
  test('glued unit', () => {
    const i = single('500g flour');
    expect([i.quantity, i.unit, i.name]).toEqual([500, 'gram', 'Flour']);
  });
  test('decimal quantity', () => {
    const i = single('1.5 l orange juice');
    expect([i.quantity, i.unit]).toEqual([1.5, 'liter']);
  });
  test('count without unit', () => {
    const i = single('3 avocados');
    expect([i.quantity, i.unit, i.name]).toEqual([3, null, 'Avocados']);
  });
  test('trailing multipliers', () => {
    expect(single('milk x3').quantity).toBe(3);
    expect(single('milk ×2').quantity).toBe(2);
    expect(single('milk 4x').quantity).toBe(4);
    expect(single('milk x 5').quantity).toBe(5);
    expect(single('milk x3').name).toBe('Milk');
  });
  test('number words and dozens', () => {
    expect(single('two apples').quantity).toBe(2);
    expect(single('a dozen eggs').quantity).toBe(12);
    expect(single('2 dozen eggs').quantity).toBe(24);
    expect(single('a dozen eggs').name).toBe('Eggs');
  });
  test('filler word after unit', () => {
    const i = single('2 bottles of wine');
    expect([i.unit, i.name]).toEqual(['bottle', 'Wine']);
  });
  test('multiple items across separators', () => {
    expect(SmartItemParser.parse('eggs, bread; butter\nmilk + jam').map((i) => i.name)).toEqual(['Eggs', 'Bread', 'Butter', 'Milk', 'Jam']);
  });
  test('"and" is not a separator', () => {
    expect(single('mac and cheese').name).toBe('Mac and cheese');
  });
  test('a unit word alone is treated as a name', () => {
    expect(single('2 bags').name).toBe('Bags');
  });
  test('blank and numeric-only input is ignored', () => {
    expect(SmartItemParser.parse('  ,  ;')).toEqual([]);
    expect(SmartItemParser.parse('42')).toEqual([]);
  });
});
