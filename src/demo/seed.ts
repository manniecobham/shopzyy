import { uuid } from '../lib/uuid';
import { makeHousehold, makeItem, makeMember, makePurchase } from '../models/factories';
import { setCategoryChoice, setRecipient, putOnList } from '../models/itemOps';
import type { ItemCategory, MeasurementUnit } from '../models/enums';
import type { ServiceEnv } from '../services/ports';
import { ShoppingListService } from '../services/ShoppingListService';

export const DEMO_HOUSEHOLD_ID = '5B0B7B8E-3C55-4C1E-9D3E-6A1F1D2C0001';
export const DEMO_USER_KEY = 'preview-user';
export const DEMO_PROFILE = { name: 'Ama', emoji: '👩🏾', colorHex: '#34C759' };

interface Habit { name: string; category: ItemCategory; everyDays: number; purchases: number; lastBoughtDaysAgo: number; quantity?: number; unit?: MeasurementUnit }

const HABITS: Habit[] = [
  { name: 'Milk', category: 'dairy', everyDays: 7, purchases: 6, lastBoughtDaysAgo: 11, quantity: 2, unit: 'carton' },
  { name: 'Bread', category: 'bakery', everyDays: 4, purchases: 8, lastBoughtDaysAgo: 4, unit: 'loaf' },
  { name: 'Eggs', category: 'dairy', everyDays: 10, purchases: 5, lastBoughtDaysAgo: 9, quantity: 12 },
  { name: 'Bananas', category: 'produce', everyDays: 5, purchases: 6, lastBoughtDaysAgo: 1, quantity: 1, unit: 'bunch' },
  { name: 'Rice', category: 'pantry', everyDays: 30, purchases: 4, lastBoughtDaysAgo: 20, quantity: 5, unit: 'kilogram' },
  { name: 'Coffee', category: 'pantry', everyDays: 14, purchases: 4, lastBoughtDaysAgo: 22, unit: 'bag' },
  { name: 'Toilet paper', category: 'household', everyDays: 21, purchases: 4, lastBoughtDaysAgo: 19, unit: 'pack' },
  { name: 'Olive oil', category: 'pantry', everyDays: 0, purchases: 1, lastBoughtDaysAgo: 50, unit: 'bottle' },
  { name: 'Dish soap', category: 'household', everyDays: 0, purchases: 1, lastBoughtDaysAgo: 40 },
];

export function seedDemo(env: ServiceEnv, now: Date = new Date()): string {
  const { store } = env;
  const hid = DEMO_HOUSEHOLD_ID;
  store.insertHousehold(makeHousehold({ id: hid, name: 'The Mensah home', ownerRecordName: DEMO_USER_KEY, isOwnedByMe: true, createdAt: now }));
  const ama = store.insertMember(makeMember(hid, DEMO_USER_KEY, DEMO_PROFILE));
  const ada = store.insertMember(makeMember(hid, `sample-ada-${uuid()}`, { name: 'Ada', emoji: '👩🏾', colorHex: '#0A84FF' }));
  const tunde = store.insertMember(makeMember(hid, `sample-tunde-${uuid()}`, { name: 'Tunde', emoji: '👨🏾', colorHex: '#FF9F0A' }));
  const people = [ama, ada, tunde];

  HABITS.forEach((habit, habitIndex) => {
    const item = store.insertItem(makeItem(habit.name, habit.category, hid, now));
    item.preferredQuantity = habit.quantity ?? 1;
    item.preferredUnitRaw = habit.unit ?? null;
    for (let i = 0; i < habit.purchases; i++) {
      const jitter = habit.everyDays > 3 ? (i % 3) - 1 : 0;
      const daysAgo = habit.lastBoughtDaysAgo + i * habit.everyDays + (i === 0 ? 0 : jitter);
      const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo, 17 + (i % 3), 15 * (i % 4));
      const record = store.insertPurchase(makePurchase(date, habit.quantity ?? 1, habit.unit ?? null, env.prefs.deviceID, hid));
      store.linkPurchase(record, item, people[(habitIndex + i) % people.length]);
    }
  });

  const tomatoes = store.insertItem(makeItem('Tomatoes', 'produce', hid, now));
  putOnList(tomatoes, 1, 'kilogram', ada, new Date(now.getTime() - 3_600_000));
  const chicken = store.insertItem(makeItem('Chicken breast', 'meat', hid, now));
  putOnList(chicken, 2, 'kilogram', tunde, new Date(now.getTime() - 7_200_000));
  chicken.note = 'Skinless if they have it';

  // The "fuller" demo list: assigning, "for whom" and a custom category.
  const list = new ShoppingListService(env, hid);
  const party = list.categoryChoiceNamed('Party supplies');
  const additions: [string, typeof ama, number][] = [
    ['2 kg rice', ama, 5], ['avocados x3', ada, 12], ['Greek yoghurt', tunde, 30],
    ['birthday candles', ama, 45], ['6 oranges', ada, 70], ['dish soap', tunde, 90],
  ];
  for (const [text, by, minutesAgo] of additions) list.addFromText(text, by, new Date(now.getTime() - minutesAgo * 60_000));
  const candles = list.itemMatching('birthday candles');
  if (candles && party) {
    setCategoryChoice(candles, party);
    setRecipient(candles, { kind: 'named', name: 'the kids' });
    candles.assignedTo = tunde;
  }
  const yoghurt = list.itemMatching('Greek yoghurt');
  if (yoghurt) setRecipient(yoghurt, { kind: 'member', member: ada });
  const avocados = list.itemMatching('avocados');
  if (avocados) avocados.assignedTo = ama;
  tomatoes.assignedTo = ada;
  setRecipient(chicken, { kind: 'named', name: 'Grandma' });

  store.commit();
  return hid;
}

export function startDemoTour(go: (path: string) => void, firstDelayMs = 25_000, stepMs = 25_000): void {
  const stops = ['/suggestions', '/activity', '/household', '/'];
  stops.forEach((path, i) => setTimeout(() => go(path), firstDelayMs + i * stepMs));
}
