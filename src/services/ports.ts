import type { DataStore } from '../data/DataStore';
import type { Entity, Household } from '../models/entities';
import type { RestockForecast } from '../logic/SuggestionEngine';

/** What the Firebase sync layer offers the services. All optional behaviour is a no-op when absent (tests, demo). */
export interface SyncBackend {
  save(changed: Entity[]): void;
  delete(removed: Entity[]): void;
  /** A new household owned by this person. */
  createHousehold(household: Household): void;
  /** Owner deleting a household for everyone. */
  deleteHousehold(household: Household): void;
  availability(household: Household): Promise<'available' | 'gone' | 'unknown'>;
  /** A member leaving a household they joined. */
  leave(household: Household): Promise<void>;
  /** Removes an entity and waits for the server to accept it. */
  deleteNow(entity: Entity): Promise<void>;
  /** Flushes queued writes. */
  sendNow(): Promise<void>;
  stop(): void;
}

export interface Notifier {
  scheduleRestockReminders(forecasts: RestockForecast[]): Promise<void>;
  removeAll(): Promise<void>;
}

export const noopNotifier: Notifier = {
  scheduleRestockReminders: async () => {},
  removeAll: async () => {},
};

/** Per-person values the Swift app kept in UserDefaults. */
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

/** Thrown by sync when a household no longer exists on the server. */
export class HouseholdGoneError extends Error {
  readonly householdGone = true;
  constructor(message = 'This household no longer exists.') { super(message); this.name = 'HouseholdGoneError'; }
}
export const isHouseholdGone = (e: unknown): boolean => !!e && typeof e === 'object' && (e as { householdGone?: boolean }).householdGone === true;
