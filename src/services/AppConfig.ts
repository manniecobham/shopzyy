import { doc, getDoc, getFirestore } from '@react-native-firebase/firestore';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { Observable } from '../lib/observable';
import type { AppPreferences } from './AppPreferences';

/** Settings you edit by hand in the Firebase console, at `config/app`. */
export interface RemoteConfig {
  /** Versions older than this are asked to update before they can be used (e.g. "1.2.0"). */
  minimumVersion?: string;
  /** Shown on the update screen. */
  message?: string;
  iosStoreUrl?: string;
  androidStoreUrl?: string;
  /** Set to false once the migration from the original iOS app is no longer wanted. */
  migrationEnabled?: boolean;
  /** Your estimate of the original app's active users; used only by the daily adoption report. */
  legacyUserEstimate?: number;
}

const CACHE_KEY = 'shopzy.remoteConfig';

/** -1, 0 or 1. Compares dotted numeric versions ("1.10.0" > "1.9.2"); missing parts count as 0. */
export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0);
  const pb = b.split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d < 0 ? -1 : 1;
  }
  return 0;
}

export const appVersion = (): string => Constants.expoConfig?.version ?? '1.0.0';

/**
 * Remote settings with a local cache, so the update check and the migration switch still work
 * offline with the last values seen. Fetching never blocks the app: failures are ignored.
 */
export class AppConfigService extends Observable {
  config: RemoteConfig;

  constructor(private readonly prefs: AppPreferences, private readonly version: string = appVersion()) {
    super();
    this.config = prefs.getJSON<RemoteConfig>(CACHE_KEY) ?? {};
  }

  /** Re-read the cache once preferences have loaded. */
  reloadFromCache(): void {
    this.config = this.prefs.getJSON<RemoteConfig>(CACHE_KEY) ?? {};
    this.changed();
  }

  async refresh(): Promise<void> {
    try {
      const snap = await getDoc(doc(getFirestore(), 'config', 'app'));
      this.config = snap.exists() ? (snap.data() as RemoteConfig) : {};
      this.prefs.setJSON(CACHE_KEY, this.config);
      this.changed();
    } catch {
      // Offline or rules not deployed yet: keep what we have.
    }
  }

  /** True when this build is older than the minimum you set. */
  get updateRequired(): boolean {
    const min = this.config.minimumVersion;
    return !!min && compareVersions(this.version, min) < 0;
  }

  get storeUrl(): string | null {
    return (Platform.OS === 'ios' ? this.config.iosStoreUrl : this.config.androidStoreUrl) ?? null;
  }

  get migrationEnabled(): boolean { return this.config.migrationEnabled !== false; }
}
