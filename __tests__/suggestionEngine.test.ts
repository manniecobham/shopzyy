import { suggestionReason } from '../src/logic/SuggestionEngine';
import { NOW, daysAgo, engine as makeEngine, history } from './testSupport';

const engine = makeEngine();
const DAY = 86_400_000;

describe('SuggestionEngine', () => {
  test('weekly item slightly past its rhythm is due soon', () => {
    const r = engine.suggestions([history('Milk', [9, 16, 23, 30, 37])], NOW);
    expect(r).toHaveLength(1);
    expect(r[0].kind).toBe('dueSoon');
    expect(r[0].typicalIntervalDays).toBe(7);
    expect(suggestionReason(r[0])).toBe('Usually bought weekly, last bought 9 days ago');
  });
  test('weekly item well past its rhythm is overdue', () => {
    expect(engine.suggestions([history('Milk', [11, 18, 25, 32])], NOW)[0].kind).toBe('overdue');
  });
  test('recently bought item is not suggested', () => {
    expect(engine.suggestions([history('Milk', [2, 9, 16, 23])], NOW)).toEqual([]);
  });
  test('items already on the list are excluded', () => {
    expect(engine.suggestions([history('Milk', [11, 18, 25], { onList: true })], NOW)).toEqual([]);
  });
  test('snoozed items are excluded until the snooze ends', () => {
    const snoozed = history('Milk', [11, 18, 25], { snoozedUntil: new Date(NOW.getTime() + DAY) });
    const expired = history('Bread', [11, 18, 25], { snoozedUntil: new Date(NOW.getTime() - DAY) });
    expect(engine.suggestions([snoozed, expired], NOW).map((s) => s.name)).toEqual(['Bread']);
  });
  test('single old purchase becomes long-time-no-see', () => {
    const r = engine.suggestions([history('Olive oil', [45])], NOW);
    expect(r[0].kind).toBe('longTimeNoSee');
    expect(suggestionReason(r[0])).toBe("Haven't bought this in 6 weeks");
  });
  test('single recent purchase is not suggested', () => {
    expect(engine.suggestions([history('Olive oil', [3])], NOW)).toEqual([]);
  });
  test('abandoned habit is downgraded to long-time-no-see', () => {
    expect(engine.suggestions([history('Juice', [60, 67, 74, 81])], NOW)[0].kind).toBe('longTimeNoSee');
  });
  test('daily habit missed for a few days is still overdue, not abandoned', () => {
    expect(engine.suggestions([history('Bread', [5, 6, 7, 8, 9])], NOW)[0].kind).toBe('overdue');
  });
  test('purchases on the same day count once', () => {
    const p = engine.pattern([daysAgo(7), daysAgo(7), daysAgo(14), daysAgo(21)]);
    expect(p?.purchaseDays).toBe(3);
    expect(p?.expectedIntervalDays).toBe(7);
  });
  test('regular habits score as more regular than erratic ones', () => {
    const regular = engine.pattern([7, 14, 21, 28].map(daysAgo))!;
    const erratic = engine.pattern([2, 4, 20, 23, 40].map(daysAgo))!;
    expect(regular.regularity).toBeCloseTo(1, 4);
    expect(erratic.regularity).toBeLessThan(0.7);
  });
  test('recency weighting adapts when a habit speeds up', () => {
    const p = engine.pattern([1, 8, 15, 22, 52, 82].map(daysAgo))!;
    expect(p.expectedIntervalDays!).toBeLessThan(15);
  });
  test('overdue items rank ahead of due-soon items', () => {
    const dueSoon = history('Eggs', [9, 19, 29, 39]);
    const overdue = history('Coffee', [22, 36, 50, 64]);
    expect(engine.suggestions([dueSoon, overdue], NOW).map((s) => s.name)).toEqual(['Coffee', 'Eggs']);
  });
  test('forecast predicts next purchase from rhythm', () => {
    const f = engine.forecasts([history('Milk', [3, 10, 17, 24])], NOW)[0];
    expect(f.typicalIntervalDays).toBe(7);
    expect(f.expectedDate.getTime()).toBe(Date.UTC(2026, 2, 22)); // start of day, 4 days ahead
  });
  test('forecast skips items on the list and overdue items', () => {
    const onList = history('Milk', [3, 10, 17], { onList: true });
    const overdue = history('Bread', [10, 14, 18]);
    expect(engine.forecasts([onList, overdue], NOW)).toEqual([]);
  });
});
