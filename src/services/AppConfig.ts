import { doc, getDoc, getFirestore } from '@react-native-firebase/firestore';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { Observable } from '../lib/observable';
import { storeUrl as defaultStoreUrl } from '../lib/storeLinks';
import type { AppPreferences } from './AppPreferences';

export interface RemoteConfig {
  minimumVersion?: string;
  message?: string;
  iosStoreUrl?: string;
  androidStoreUrl?: string;
  latestVersionIos?: string;
  latestVersionAndroid?: string;
  migrationEnabled?: boolean;
  legacyUserEstimate?: number;
}

const CACHE_KEY = 'shopzy.remoteConfig';
const DISMISSED_KEY = 'shopzy.updateDismissed';
const NUDGE_PAUSE_MS = 3 * 24 * 60 * 60 * 1000;

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

const nativeBuild = (): string | null => {
  try { return (require('expo-application') as typeof import('expo-application')).nativeBuildVersion; } catch { return null; }
};

export const displayVersion = (): string => {
  const build = nativeBuild();
  return build ? `${appVersion()}.${build}` : appVersion();
};

export class AppConfigService extends Observable {
  config: RemoteConfig;

  constructor(private readonly prefs: AppPreferences, private readonly version: string = appVersion()) {
    super();
    this.config = prefs.getJSON<RemoteConfig>(CACHE_KEY) ?? {};
  }

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

  get updateRequired(): boolean {
    const min = this.config.minimumVersion;
    return !!min && compareVersions(this.version, min) < 0;
  }

  get storeUrl(): string {
    return (Platform.OS === 'ios' ? this.config.iosStoreUrl : this.config.androidStoreUrl) || defaultStoreUrl();
  }

  get latestVersion(): string | null {
    return (Platform.OS === 'ios' ? this.config.latestVersionIos : this.config.latestVersionAndroid) || null;
  }

  // A newer version is out and this one is still allowed to run.
  get updateOffered(): boolean {
    const latest = this.latestVersion;
    return !this.updateRequired && !!latest && compareVersions(this.version, latest) < 0;
  }

  // Same, but quiet for a few days after the person chose "Later".
  updateNudgeVisible(now: number = Date.now()): boolean {
    if (!this.updateOffered) return false;
    const dismissed = this.prefs.getJSON<{ version: string; at: number }>(DISMISSED_KEY);
    return !(dismissed && dismissed.version === this.latestVersion && now - dismissed.at < NUDGE_PAUSE_MS);
  }

  dismissUpdateNudge(now: number = Date.now()): void {
    const latest = this.latestVersion;
    if (!latest) return;
    this.prefs.setJSON(DISMISSED_KEY, { version: latest, at: now });
    this.changed();
  }

  get migrationEnabled(): boolean { return this.config.migrationEnabled !== false; }
}
