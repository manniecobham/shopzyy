import type { AppPreferences } from './AppPreferences';
import { StorageKeys } from './storageKeys';

const LIMIT = 50;

export const SkippedTrips = {
  contains(prefs: AppPreferences, key: string): boolean {
    return (prefs.getJSON<string[]>(StorageKeys.skippedTrips) ?? []).includes(key);
  },
  insert(prefs: AppPreferences, key: string): void {
    const all = prefs.getJSON<string[]>(StorageKeys.skippedTrips) ?? [];
    prefs.setJSON(StorageKeys.skippedTrips, [...all, key].slice(-LIMIT));
  },
};
