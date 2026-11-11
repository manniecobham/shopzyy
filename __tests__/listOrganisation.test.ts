import { makeSections } from '../src/logic/listGrouping';
import { ShoppingTrip } from '../src/logic/ShoppingTrip';
import { builtIn } from '../src/models/choices';
import { makeHousehold } from '../src/models/factories';
import { getRecipient, lastPurchase, setRecipient } from '../src/models/itemOps';
import { fixture } from './env';

describe('Assigning, recipients and grouping', () => {
  test('assignment and recipient are saved, and cleared once bought', () => {
    const f = fixture();
    const ada = f.member('Ada');
    const tunde = f.member('Tunde');
    const cake = f.item('Cake');
    f.list.update(cake, { name: 'Cake', quantity: 1, unit: null, category: builtIn('bakery'), room: null, note: '', assignedTo: ada, recipient: { kind: 'named', name: '  Grandma ' } });
    expect(cake.assignedTo).toBe(ada);
    expect(getRecipient(cake)).toEqual({ kind: 'named', name: 'Grandma' });

    // Someone other than the assignee can still buy it.
    f.list.markBought(cake, tunde);
    expect(lastPurchase(cake)?.member).toBe(tunde);
    expect(cake.assignedTo).toBeNull();
    expect(getRecipient(cake)).toBeNull();
  });

  test('a member recipient replaces a typed one', () => {
    const f = fixture();
    const ada = f.member('Ada');
    const socks = f.item('Socks');
    setRecipient(socks, { kind: 'named', name: 'the kids' });
    setRecipient(socks, { kind: 'member', member: ada });
    expect(socks.forName).toBeNull();
    expect(getRecipient(socks)).toEqual({ kind: 'member', member: ada });
    setRecipient(socks, { kind: 'named', name: '   ' });
    expect(getRecipient(socks)).toBeNull(); // blank names mean nobody in particular
  });

  test('grouping by assignee puts unassigned items last', () => {
    const f = fixture();
    const ada = f.member('Ada');
    const milk = f.item('Milk');
    const eggs = f.item('Eggs');
    milk.assignedTo = ada;
    const sections = makeSections([eggs, milk], 'assignee');
    expect(sections.map((s) => s.key)).toEqual(['assignee:_ada', 'assignee:none']);
    expect(sections[0].items.map((i) => i.name)).toEqual(['Milk']);
  });

  test('grouping by recipient merges typed names regardless of case', () => {
    const f = fixture();
    const toys = f.item('Toys');
    const juice = f.item('Juice');
    setRecipient(toys, { kind: 'named', name: 'The kids' });
    setRecipient(juice, { kind: 'named', name: 'the kids' });
    const sections = makeSections([toys, juice], 'recipient');
    expect(sections).toHaveLength(1);
    expect(sections[0].items).toHaveLength(2);
  });

  test('a saved section order wins; new sections fall back to the default order', () => {
    const f = fixture();
    const items = [f.item('Milk', 'dairy'), f.item('Apples', 'produce'), f.item('Bread', 'bakery')];
    const defaultOrder = makeSections(items, 'category').map((s) => s.key);
    expect(defaultOrder[0]).toBe('category:produce'); // produce comes first when walking a store

    const custom = makeSections(items, 'category', ['category:dairy']).map((s) => s.key);
    expect(custom[0]).toBe('category:dairy');
    expect(custom.slice(1)).toEqual(defaultOrder.filter((k) => k !== 'category:dairy'));
  });

  test('saving an order for one grouping keeps the order of another', () => {
    const f = fixture();
    const household = f.store.insertHousehold(makeHousehold({ id: f.householdID, name: 'Home', ownerRecordName: '_ada', isOwnedByMe: true }));
    f.households.setSectionOrder(['room:garden', 'room:kitchen'], household);
    f.households.setSectionOrder(['category:dairy', 'category:produce'], household);
    expect(household.sectionOrder).toEqual(['category:dairy', 'category:produce', 'room:garden', 'room:kitchen']);
  });
});
