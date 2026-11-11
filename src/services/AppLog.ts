import AsyncStorage from '@react-native-async-storage/async-storage';
import { collection, doc, getFirestore, setDoc } from '@react-native-firebase/firestore';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { Observable } from '../lib/observable';
import { uuid } from '../lib/uuid';

export type LogLevel = 'info' | 'warning' | 'error';
export type LogArea = 'sync' | 'sharing' | 'household' | 'list' | 'account' | 'storage';
export const LOG_AREA_TITLE: Record<LogArea, string> = {
  sync: 'Syncing', sharing: 'Invites', household: 'Household', list: 'Shopping list', account: 'Account', storage: 'Saving',
};

/** One error or warning the app ran into. Technical details only: never names, list items, household names, emails or other personal data. */
export interface LogEntry {
  id: string;
  date: number; // ms since epoch
  level: LogLevel;
  area: LogArea;
  message: string;
  errorDomain: string | null;
  errorCode: string | null;
  errorDetail: string | null;
  appVersion: string;
  osVersion: string;
  deviceModel: string;
  isUploaded: boolean;
}

const KEY = 'shopzy.errorLog';
const MAX_ENTRIES = 500;

/**
 * Records errors so they can be fixed. Every entry is kept on the device (Settings → Diagnostics)
 * and uploaded anonymously to the `errorLogs` Firestore collection, which only the developer can
 * read (in the Firebase console). The upload carries no user identity.
 */
class AppLogService extends Observable {
  /** Newest first. */
  entries: LogEntry[] = [];
  private loaded = false;
  private uploading = false;
  /** Off in tests and demo mode. */
  uploadsEnabled = true;

  async load(): Promise<void> {
    if (this.loaded) return;
    this.loaded = true;
    try {
      const raw = await AsyncStorage.getItem(KEY);
      if (raw) this.entries = [...(JSON.parse(raw) as LogEntry[]), ...this.entries].slice(0, MAX_ENTRIES);
      this.changed();
    } catch { /* start empty */ }
  }

  info(area: LogArea, message: string): void { this.record('info', area, message); }
  error(area: LogArea, message: string, error?: unknown): void { this.record('error', area, message, error); }
  warning(area: LogArea, message: string, error?: unknown): void { this.record('warning', area, message, error); }

  clear(): void {
    this.entries = [];
    this.persist();
    this.changed();
  }

  /** Sends entries that haven't reached Firestore yet. Safe to call often. */
  async uploadPending(): Promise<void> {
    if (!this.uploadsEnabled || this.uploading) return;
    const pending = this.entries.filter((e) => !e.isUploaded).slice(0, 25);
    if (pending.length === 0) return;
    this.uploading = true;
    try {
      const db = getFirestore();
      await Promise.all(pending.map(async (e) => {
        const { isUploaded: _skip, ...data } = e;
        await setDoc(doc(collection(db, 'errorLogs'), e.id), { ...data, date: new Date(e.date) });
        e.isUploaded = true;
      }));
      this.persist();
      this.changed();
    } catch {
      // Never log upload failures as entries, or an offline phone would loop.
    } finally {
      this.uploading = false;
    }
  }

  private record(level: LogLevel, area: LogArea, message: string, error?: unknown): void {
    const e = error as { code?: unknown; name?: string; message?: string } | undefined;
    const entry: LogEntry = {
      id: uuid(), date: Date.now(), level, area, message: message.slice(0, 300),
      errorDomain: e?.name ?? null, errorCode: e?.code != null ? String(e.code) : null,
      errorDetail: e?.message ? e.message.slice(0, 500) : null,
      appVersion: Constants.expoConfig?.version ?? '1.0',
      osVersion: `${Platform.OS} ${Platform.Version}`,
      deviceModel: Device.modelId ?? Device.modelName ?? 'unknown',
      isUploaded: false,
    };
    if (__DEV__) console.warn(`[${area}] ${message}`, entry.errorDetail ?? '');
    this.entries = [entry, ...this.entries].slice(0, MAX_ENTRIES);
    this.persist();
    this.changed();
    void this.uploadPending();
  }

  private persist(): void {
    void AsyncStorage.setItem(KEY, JSON.stringify(this.entries)).catch(() => {});
  }
}

export const AppLog = new AppLogService();
