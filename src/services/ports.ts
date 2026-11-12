import type { DataStore } from '../data/DataStore';
import type { Entity, Household } from '../models/entities';
import type { RestockForecast } from '../logic/SuggestionEngine';
import type { ShoppingTrip } from '../logic/ShoppingTrip';

export interface SyncBackend {
  save(changed: Entity[]): void;
  delete(removed: Entity[]): void;
  createHousehold(household: Household): void;
  deleteHousehold(household: Household): void;
  availability(household: Household): Promise<'available' | 'gone' | 'unknown'>;
  leave(household: Household): Promise<void>;
  deleteNow(entity: Entity): Promise<void>;
  sendNow(): Promise<void>;
  stop(): void;
}

export interface Notifier {
  scheduleRestockReminders(forecasts: RestockForecast[]): Promise<void>;
  postShoppingTrip(trip: ShoppingTrip, householdName: string | null, totalText: string | null, now: Date): Promise<void>;
  removeAll(): Promise<void>;
}

export const noopNotifier: Notifier = {
  scheduleRestockReminders: async () => {},
  postShoppingTrip: async () => {},
  removeAll: async () => {},
};

export interface Preferences {
  userRecordName: string | null;
  currentHouseholdID: string | null;
  readonly deviceID: string;
}

export class MemoryPreferences implements Preferences {
  userRecordName: string | null = null;
  currentHouseholdID: string | null = null;
  deviceID = 'test-device';
}

export interface ServiceEnv {
  store: DataStore;
  sync: SyncBackend | null;
  prefs: Preferences;
  notifier: Notifier;
}

export class HouseholdGoneError extends Error {
  readonly householdGone = true;
  constructor(message = 'This household no longer exists.') { super(message); this.name = 'HouseholdGoneError'; }
}
export const isHouseholdGone = (e: unknown): boolean => {
  if (!e || typeof e !== 'object') return false;
  if ((e as { householdGone?: boolean }).householdGone === true) return true;
  const code = String((e as { code?: unknown }).code ?? '');
  return code === 'not-found' || code === 'functions/not-found' || code === 'firestore/not-found' || code === 'firestore/permission-denied';
};
