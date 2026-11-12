import { DataStore } from '../src/data/DataStore';
import { MemoryPreferences, noopNotifier, type ServiceEnv } from '../src/services/ports';
import { ShoppingListService } from '../src/services/ShoppingListService';
import { HouseholdService } from '../src/services/HouseholdService';
import { makeItem, makeMember, suggestedProfile } from '../src/models/factories';
import type { GroceryItem, HouseholdMember } from '../src/models/entities';
import type { ItemCategory } from '../src/models/enums';
import { putOnList } from '../src/models/itemOps';
import { uuid } from '../src/lib/uuid';
import { NOW } from './testSupport';

export function makeEnv(): ServiceEnv {
  return { store: new DataStore(), sync: null, prefs: new MemoryPreferences(), notifier: noopNotifier };
}

export function fixture() {
  const env = makeEnv();
  const householdID = uuid();
  return {
    env,
    store: env.store,
    householdID,
    list: new ShoppingListService(env, householdID),
    households: new HouseholdService(env),
    member(name: string): HouseholdMember {
      return env.store.insertMember(makeMember(householdID, `_${name.toLowerCase()}`, suggestedProfile(name)));
    },
    item(name: string, category: ItemCategory = 'other'): GroceryItem {
      const item = env.store.insertItem(makeItem(name, category, householdID));
      putOnList(item, 1, null, null, NOW);
      return item;
    },
  };
}
