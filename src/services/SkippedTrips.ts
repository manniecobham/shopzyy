import type { AppPreferences } from './AppPreferences';
import { StorageKeys } from './storageKeys';

const LIMIT = 50;

/** Trips this person has been asked about and said "skip" to, so the banner doesn't come back for them. */
export const SkippedTrips = {
  contains(prefs: AppPreferences, key: string): boolean {
    return (prefs.getJSON<string[]>(StorageKeys.skippedTrips) ?? []).includes(key);
  },
  insert(prefs: AppPreferences, key: string): void {
    const all = prefs.getJSON<string[]>(StorageKeys.skippedTrips) ?? [];
    prefs.setJSON(StorageKeys.skippedTrips, [...all, key].slice(-LIMIT));
  },
};
