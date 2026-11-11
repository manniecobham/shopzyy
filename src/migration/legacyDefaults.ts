import type { LegacyDefaults } from '../../modules/shopzy-legacy';
import { normalizeUUID } from '../lib/uuid';
import { StorageKeys } from '../services/storageKeys';

/** The slice of AppPreferences this needs, so it can be tested without AsyncStorage. */
export interface PrefsWriter {
  getString(key: string): string | null;
  setString(key: string, value: string | null): void;
  setBool(key: string, value: boolean): void;
  setJSON(key: string, value: unknown): void;
}

export const LEGACY_APPLIED_KEY = 'shopzy.legacyDefaultsApplied';
/** Set (and kept) on phones that had the original Swift app, so only they are offered "Import from the old Shopzy app". */
export const HAD_LEGACY_APP_KEY = 'shopzy.hadLegacyApp';

/**
 * Carries the old app's settings into the new app's preferences, exactly once (the first launch
 * after the update): who they are, their profile, which household was open, notification choices,
 * and this install's device id, so purchases made on this phone before the update are still
 * recognised as "mine". Returns true if anything was applied.
 */
export function applyLegacyDefaults(prefs: PrefsWriter, d: LegacyDefaults): boolean {
  if (prefs.getString(LEGACY_APPLIED_KEY)) return false;
  prefs.setString(LEGACY_APPLIED_KEY, '1');
  if (!d.userRecordName) return false; // the old app was never set up on this phone

  prefs.setString(HAD_LEGACY_APP_KEY, '1');
  prefs.setString(StorageKeys.userRecordName, d.userRecordName);
  // They already went through the old welcome screen.
  prefs.setBool(StorageKeys.hasSeenWelcome, d.hasSeenWelcome ?? true);

  if (d.profile) {
    try {
      const p = JSON.parse(d.profile) as { name?: string; emoji?: string; colorHex?: string };
      if (p.name) prefs.setJSON(StorageKeys.profile, { name: p.name, emoji: p.emoji ?? '🙂', colorHex: p.colorHex ?? '#34C759' });
    } catch { /* they'll set a profile again */ }
  }
  if (d.currentHouseholdID) prefs.setString(StorageKeys.currentHouseholdID, normalizeUUID(d.currentHouseholdID));
  if (d.deviceID) prefs.setString(StorageKeys.deviceID, d.deviceID);
  if (d.notifyPurchases !== undefined) prefs.setBool(StorageKeys.notifyPurchases, d.notifyPurchases);
  if (d.notifyRestock !== undefined) prefs.setBool(StorageKeys.notifyRestock, d.notifyRestock);
  if (d.announcedTrips) prefs.setJSON(StorageKeys.announcedTrips, d.announcedTrips);
  if (d.skippedTrips) prefs.setJSON(StorageKeys.skippedTrips, d.skippedTrips);
  return true;
}
