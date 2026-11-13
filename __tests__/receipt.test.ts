import { matchReceipt } from '../src/logic/receiptMatch';
import { parseAmount, parseReceipt } from '../src/logic/receiptParser';

describe('parseAmount', () => {
  test('handles decimal comma, point and thousands separators', () => {
    expect(parseAmount('12,50')).toBe(12.5);
    expect(parseAmount('12.50')).toBe(12.5);
    expect(parseAmount('1.234,56')).toBe(1234.56);
    expect(parseAmount('1,234.56')).toBe(1234.56);
    expect(parseAmount('abc')).toBeNull();
  });
});

describe('parseReceipt', () => {
  test('reads store, items and the total from inline prices', () => {
    const r = parseReceipt([
      'ALBERT HEIJN', 'Kassabon 12/05/2026 14:32', 'BANANAS 1,29', '2 x MILK SEMI 1L 2,18', 'WHOLE BREAD 1,99',
      'SUBTOTAAL 5,46', 'BTW 9% 0,45', 'TOTAAL 5,46', 'PIN 5,46', 'Bedankt voor uw bezoek',
    ]);
    expect(r.storeName).toBe('Albert Heijn');
    expect(r.total).toBe(5.46);
    expect(r.items.map((i) => i.name)).toEqual(['Bananas', 'Milk Semi 1L', 'Whole Bread']);
    expect(r.items[1].quantity).toBe(2);
    expect(r.items[0].price).toBe(1.29);
  });

  test('does not take cash, change or tax as the total', () => {
    const r = parseReceipt(['Shop', 'Eggs 3.00', 'Total 3.00', 'Cash 5.00', 'Change 2.00', 'VAT total 0.50']);
    expect(r.total).toBe(3);
  });

  test('takes the total from the next line when it is printed separately', () => {
    const r = parseReceipt(['Store', 'Apples 2.00', 'TOTAL', '2.00']);
    expect(r.total).toBe(2);
  });

  test('pairs names and prices when they come as separate columns', () => {
    const r = parseReceipt(['Store', 'Apples', 'Rice', 'Pasta', '2.00', '3.50', '1.20', 'TOTAL 6.70']);
    expect(r.items).toEqual([
      { name: 'Apples', quantity: 1, price: 2 }, { name: 'Rice', quantity: 1, price: 3.5 }, { name: 'Pasta', quantity: 1, price: 1.2 },
    ]);
    expect(r.total).toBe(6.7);
  });

  test('ignores weight lines, barcodes and discounts', () => {
    const r = parseReceipt(['Store', 'Tomatoes 3,10', '0,532 kg x 2,99 EUR/kg', '5449000000996 Cola 1,50', 'Discount -0,50', 'Total 4,60']);
    expect(r.items.map((i) => i.name)).toEqual(['Tomatoes', 'Cola']);
  });

  test('falls back to the sum of items when no total is printed', () => {
    expect(parseReceipt(['Store', 'Apples 2.00', 'Rice 3.50']).total).toBe(5.5);
    expect(parseReceipt(['nothing useful']).total).toBeNull();
  });
});

describe('matchReceipt', () => {
  const list = [{ id: '1', name: 'Milk' }, { id: '2', name: 'Orange juice' }, { id: '3', name: 'Banana' }, { id: '4', name: 'Eggs' }];
  const line = (name: string) => ({ name, quantity: 1, price: null });

  test('matches on stems, extra words and abbreviations', () => {
    const m = matchReceipt([line('Semi Skimmed Milk 1L'), line('Bananas'), line('Egg'), line('Banan Cav')], list);
    expect(m.map((x) => x.itemID)).toEqual(['1', '3', '4', null]);
  });

  test('requires every word of a two-word list item', () => {
    expect(matchReceipt([line('Orange')], list)[0].itemID).toBeNull();
    expect(matchReceipt([line('Orange Juice Fresh')], list)[0].itemID).toBe('2');
  });

  test('uses each list item once', () => {
    const m = matchReceipt([line('Milk'), line('Milk Chocolate')], list);
    expect(m.filter((x) => x.itemID === '1')).toHaveLength(1);
  });
});

import { rowsFromFragments, type Fragment } from '../src/logic/receiptRows';

describe('rowsFromFragments', () => {
  const ASPECT = 0.75;
  const H = 0.02;
  const tilt = (rows: { y: number; parts: [string, number][] }[], degrees: number): Fragment[] => {
    const a = (degrees * Math.PI) / 180;
    return rows.flatMap((r) => r.parts.map(([text, x]) => {
      const cx = (x + 0.05) * ASPECT;
      const cy = r.y + H / 2;
      const rx = cx * Math.cos(a) - (cy - 0.5) * Math.sin(a);
      const ry = 0.5 + (cy - 0.5) * Math.cos(a) + cx * Math.sin(a);
      return { text, x: rx / ASPECT - 0.05, y: ry - H / 2, width: 0.1, height: H };
    }));
  };

  const rewe = [
    { y: 0.05, parts: [['REWE', 0.35]] },
    { y: 0.11, parts: [['REWE MARKT', 0.3]] },
    { y: 0.4, parts: [['EUR', 0.78]] },
    { y: 0.43, parts: [['BIO H-MILCH 3,8%', 0.15], ['2,18 B', 0.72]] },
    { y: 0.46, parts: [['2 x', 0.2], ['1,09', 0.3]] },
    { y: 0.49, parts: [['CONT.LEBKUCHEN', 0.13], ['1,59 B', 0.72]] },
    { y: 0.55, parts: [['SUMME', 0.12], ['EUR', 0.55], ['3,77', 0.72]] },
    { y: 0.6, parts: [['Yapital', 0.1], ['EUR', 0.55], ['3,77', 0.72]] },
    { y: 0.7, parts: [['Kundenbeleg', 0.25]] },
  ] as { y: number; parts: [string, number][] }[];

  test('rebuilds rows when the receipt is tilted', () => {
    for (const degrees of [0, 3, -4, 7]) {
      const rows = rowsFromFragments(tilt(rewe, degrees), ASPECT);
      expect(rows).toContain('BIO H-MILCH 3,8% 2,18 B');
      expect(rows).toContain('CONT.LEBKUCHEN 1,59 B');
      expect(rows).toContain('SUMME EUR 3,77');
    }
  });

  test('parses a German receipt end to end', () => {
    const r = parseReceipt(rowsFromFragments(tilt(rewe, 4), ASPECT));
    expect(r.storeName).toBe('Rewe');
    expect(r.total).toBe(3.77);
    expect(r.items).toEqual([
      { name: 'Bio H-Milch 3,8%', quantity: 2, price: 2.18 },
      { name: 'Cont.Lebkuchen', quantity: 1, price: 1.59 },
    ]);
  });
});
