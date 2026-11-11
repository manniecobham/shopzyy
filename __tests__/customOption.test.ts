import { ShoppingListService } from '../src/services/ShoppingListService';
import { builtIn, categoryChoiceLabel, categoryChoiceTitle, roomChoiceTitle, sameChoice } from '../src/models/choices';
import { makeItem } from '../src/models/factories';
import { getCategoryChoice, getRoomChoice, itemCategory, setCategoryChoice, setRoomChoice } from '../src/models/itemOps';
import { makeSections } from '../src/logic/listGrouping';
import { uuid } from '../src/lib/uuid';
import { fixture } from './env';

describe('Custom categories and rooms', () => {
  test('typing a built-in name picks the built-in instead of creating a duplicate', () => {
    const f = fixture();
    expect(f.list.roomChoiceNamed('  kitchen ')).toEqual(builtIn('kitchen'));
    expect(f.list.categoryChoiceNamed('BAKERY')).toEqual(builtIn('bakery'));
    expect(f.store.allOptions()).toHaveLength(0);
  });

  test('custom names are created once and matched case-insensitively', () => {
    const f = fixture();
    const first = f.list.roomChoiceNamed('guest room')!;
    const second = f.list.roomChoiceNamed('Guest Room')!;
    expect(sameChoice(first, second)).toBe(true);
    expect(roomChoiceTitle(first)).toBe('Guest room');

    // Same name, different kind: a category is a separate option.
    const category = f.list.categoryChoiceNamed('Guest room')!;
    expect(categoryChoiceTitle(category)).toBe('Guest room');
    expect(f.store.allOptions()).toHaveLength(2);
    expect(f.list.categoryChoiceNamed('   ')).toBeNull();
  });

  test('each household has its own custom options', () => {
    const f = fixture();
    const other = new ShoppingListService(f.env, uuid());
    const mine = f.list.roomChoiceNamed('Patio')!;
    const theirs = other.roomChoiceNamed('Patio')!;
    expect(sameChoice(mine, theirs)).toBe(false);
    expect(f.store.allOptions()).toHaveLength(2);
  });

  test('items take custom categories and rooms; deleting them falls back', () => {
    const f = fixture();
    const item = f.store.insertItem(makeItem('Balloons', 'household', f.householdID));
    const party = f.list.categoryChoiceNamed('Party supplies')!;
    const patio = f.list.roomChoiceNamed('Patio')!;
    f.list.update(item, { name: 'Balloons', quantity: 1, unit: null, category: party, room: patio, note: '' });

    expect(sameChoice(getCategoryChoice(item), party)).toBe(true);
    expect(sameChoice(getRoomChoice(item), patio)).toBe(true);
    expect(itemCategory(item)).toBe('household'); // built-in category kept as the fallback

    if (party.kind !== 'custom' || patio.kind !== 'custom') throw new Error('Expected custom options');
    f.list.deleteOption(party.option);
    f.list.deleteOption(patio.option);

    expect(getCategoryChoice(item)).toEqual(builtIn('household'));
    expect(getRoomChoice(item)).toBeNull();
  });

  test('choosing a built-in room clears a custom one', () => {
    const f = fixture();
    const item = f.store.insertItem(makeItem('Towels', 'household', f.householdID));
    setRoomChoice(item, f.list.roomChoiceNamed('Pool house'));
    setRoomChoice(item, builtIn('bathroom'));
    expect(item.customRoom).toBeNull();
    expect(getRoomChoice(item)).toEqual(builtIn('bathroom'));
  });

  test('custom categories sort after the built-in aisles and before Other', () => {
    const f = fixture();
    const party = f.list.categoryChoiceNamed('Party supplies')!;
    const items = [
      f.store.insertItem(makeItem('Mystery', 'other', f.householdID)),
      f.store.insertItem(makeItem('Balloons', 'other', f.householdID)),
      f.store.insertItem(makeItem('Milk', 'dairy', f.householdID)),
      f.store.insertItem(makeItem('Apples', 'produce', f.householdID)),
    ];
    setCategoryChoice(items[1], party);
    const order = makeSections(items, 'category').map((s) => s.title);
    expect(order).toEqual([builtIn('produce'), builtIn('dairy'), party, builtIn('other')].map((c) => categoryChoiceLabel(c as never)));
  });
});
