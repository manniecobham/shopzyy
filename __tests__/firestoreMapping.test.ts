import { DataStore } from '../src/data/DataStore';
import { DocApplier, householdDoc, itemDoc, memberDoc, optionDoc, purchaseDoc, tripTotalDoc } from '../src/data/sync/mapping';
import { builtIn, custom } from '../src/models/choices';
import { makeHousehold, makeItem, makeMember, makeOption, makePurchase, makeTripTotal, suggestedProfile } from '../src/models/factories';
import { getRecipient, setRecipient, putOnList, getCategoryChoice } from '../src/models/itemOps';
import { uuid } from '../src/lib/uuid';
import { NOW, daysAgo } from './testSupport';

const householdID = uuid();

function roundTrip() {
  const source = new DataStore();
  const household = source.insertHousehold(makeHousehold({ id: householdID, name: 'Home', ownerRecordName: '_ada', isOwnedByMe: true }));
  household.groupingRaw = 'room';
  household.sectionOrder = ['room:kitchen'];
  household.themeRaw = 'party';
  household.currencyCode = 'GBP';
  household.imageFocusX = 0.2;
  const ada = source.insertMember(makeMember(householdID, '_ada', suggestedProfile('Ada')));
  const fridge = source.insertOption(makeOption('Fridge', 'category', householdID));
  const cake = source.insertItem(makeItem('Cake', 'bakery', householdID));
  putOnList(cake, 2, 'kilogram', ada, NOW);
  cake.assignedTo = ada;
  cake.customCategory = fridge;
  setRecipient(cake, { kind: 'named', name: 'Grandma' });
  const purchase = source.insertPurchase(makePurchase(daysAgo(7), 1, 'liter', 'dev-1', householdID));
  source.linkPurchase(purchase, cake, ada);
  const total = source.insertTripTotal(makeTripTotal({ householdID, tripKey: 'trip-1', amount: 12.3, currencyCode: 'GBP', storeName: 'Tesco', tripEndedAt: NOW, enteredBy: '_ada' }));

  const target = new DataStore();
  const applier = new DocApplier(target, { uid: 'someone-else' });
  applier.applyHousehold(householdID, { ...householdDoc(household), ownerUID: 'ada-uid' });
  // Deliberately apply items BEFORE their members/options to exercise reference retry.
  const results = {
    item: applier.apply('items', householdID, cake.id, itemDoc(cake)),
    purchase: applier.apply('purchases', householdID, purchase.id, purchaseDoc(purchase)),
  };
  applier.apply('members', householdID, ada.userRecordName, memberDoc(ada));
  applier.apply('options', householdID, fridge.id, optionDoc(fridge));
  const retried = {
    item: applier.apply('items', householdID, cake.id, itemDoc(cake)),
    purchase: applier.apply('purchases', householdID, purchase.id, purchaseDoc(purchase)),
  };
  applier.apply('tripTotals', householdID, total.id, tripTotalDoc(total));
  return { target, applier, results, retried, cake, purchase, total };
}

describe('Firestore document mapping', () => {
  test('household fields, items, references and totals survive the trip to another device', () => {
    const { target, cake, total } = roundTrip();
    const h = target.household(householdID)!;
    expect([h.groupingRaw, h.sectionOrder, h.themeRaw, h.currencyCode, h.imageFocusX]).toEqual(['room', ['room:kitchen'], 'party', 'GBP', 0.2]);
    expect(h.isOwnedByMe).toBe(false);

    const copy = target.item(cake.id)!;
    expect(copy.assignedTo?.name).toBe('Ada');
    expect(getRecipient(copy)).toEqual({ kind: 'named', name: 'Grandma' });
    expect(copy.unitRaw).toBe('kilogram');
    expect(getCategoryChoice(copy).kind).toBe('custom');
    expect(copy.purchases).toHaveLength(1);
    expect(copy.purchases[0].member?.userRecordName).toBe('_ada');

    const t = target.tripTotal(total.id)!;
    expect([t.amount, t.currencyCode, t.storeName, t.tripKey]).toEqual([12.3, 'GBP', 'Tesco', 'trip-1']);
  });

  test('documents that arrive before what they reference are flagged, then resolve on retry', () => {
    const { results, retried } = roundTrip();
    expect(results).toEqual({ item: 'missingReferences', purchase: 'missingReferences' });
    expect(retried).toEqual({ item: 'applied', purchase: 'applied' });
  });

  test('the owner sees isOwnedByMe', () => {
    const store = new DataStore();
    new DocApplier(store, { uid: 'ada-uid' }).applyHousehold(householdID, { name: 'Home', ownerUID: 'ada-uid' });
    expect(store.household(householdID)!.isOwnedByMe).toBe(true);
  });

  test('a deleted document removes the local model, and a deleted member only nullifies references', () => {
    const { target, applier, cake } = roundTrip();
    applier.remove('members', householdID, '_ada');
    expect(target.item(cake.id)!.assignedTo).toBeNull();
    expect(target.item(cake.id)!.purchases[0].member).toBeNull();
    applier.remove('items', householdID, cake.id);
    expect(target.item(cake.id)).toBeUndefined();
    expect(target.allPurchases()).toHaveLength(0); // cascade
  });

  test('Firestore Timestamps read back as dates', () => {
    const store = new DataStore();
    const ts = { toDate: () => NOW };
    new DocApplier(store, { uid: null }).applyHousehold(householdID, { name: 'Home', createdAt: ts });
    expect(store.household(householdID)!.createdAt).toEqual(NOW);
  });

  test('a household that exists again after removal accepts changes again', () => {
    const store = new DataStore();
    store.removedHouseholds.add(householdID);
    new DocApplier(store, { uid: null }).applyHousehold(householdID, { name: 'Home' });
    expect(store.removedHouseholds.has(householdID)).toBe(false);
  });
});
