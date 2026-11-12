import AsyncStorage from '@react-native-async-storage/async-storage';
import { uuid } from '../lib/uuid';
import type { Preferences } from './ports';

import { StorageKeys } from './storageKeys';
export { StorageKeys };

export class AppPreferences implements Preferences {
  private cache = new Map<string, string>();
  private loaded = false;

  async load(): Promise<void> {
    if (this.loaded) return;
    try {
      const pairs = await AsyncStorage.multiGet(Object.values(StorageKeys));
      for (const [k, v] of pairs) if (v !== null) this.cache.set(k, v);
    } catch {
      // Storage unavailable: run with defaults.
    }
    if (!this.cache.has(StorageKeys.deviceID)) this.set(StorageKeys.deviceID, uuid());
    this.loaded = true;
  }

  getString(key: string): string | null { return this.cache.get(key) ?? null; }

  setString(key: string, value: string | null): void {
    if (value === null) this.remove(key); else this.set(key, value);
  }

  getBool(key: string, fallback: boolean): boolean {
    const v = this.cache.get(key);
    return v === undefined ? fallback : v === 'true';
  }
  setBool(key: string, value: boolean): void { this.set(key, String(value)); }

  getJSON<T>(key: string): T | null {
    const v = this.cache.get(key);
    if (v === undefined) return null;
    try { return JSON.parse(v) as T; } catch { return null; }
  }
  setJSON(key: string, value: unknown): void { this.set(key, JSON.stringify(value)); }

  remove(key: string): void {
    this.cache.delete(key);
    void AsyncStorage.removeItem(key).catch(() => {});
  }

  private set(key: string, value: string): void {
    this.cache.set(key, value);
    void AsyncStorage.setItem(key, value).catch(() => {});
  }

  // Preferences (used by services)
  get userRecordName(): string | null { return this.getString(StorageKeys.userRecordName); }
  set userRecordName(v: string | null) { this.setString(StorageKeys.userRecordName, v); }
  get currentHouseholdID(): string | null { return this.getString(StorageKeys.currentHouseholdID); }
  set currentHouseholdID(v: string | null) { this.setString(StorageKeys.currentHouseholdID, v); }
  get deviceID(): string { return this.getString(StorageKeys.deviceID) ?? 'unknown-device'; }

  get purchaseAlertsEnabled(): boolean { return this.getBool(StorageKeys.notifyPurchases, true); }
  get restockRemindersEnabled(): boolean { return this.getBool(StorageKeys.notifyRestock, true); }
}
