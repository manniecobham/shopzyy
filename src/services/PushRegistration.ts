import { deleteDoc, doc, getFirestore, setDoc } from '@react-native-firebase/firestore';
import { getMessaging, getToken, onTokenRefresh, registerDeviceForRemoteMessages, deleteToken } from '@react-native-firebase/messaging';
import { Platform } from 'react-native';
import type { AppPreferences } from './AppPreferences';
import { deviceLanguageField } from './DeviceLanguage';
import { StorageKeys } from './storageKeys';
import { AppLog } from './AppLog';

/**
 * Lets the server reach this phone when the app isn't running (background "Ada went shopping"
 * alerts). Each install stores its push token at `users/{uid}/devices/{deviceID}`; the alert
 * functions read those. `alerts` mirrors the "Shopping trip alerts" switch in Settings.
 */
export class PushRegistration {
  private uid: string | null = null;
  private unsubscribe: (() => void) | null = null;

  constructor(private readonly prefs: AppPreferences, private readonly requestPermission: () => Promise<boolean>) {}

  private get alertsEnabled() { return this.prefs.getBool(StorageKeys.notifyPurchases, true); }
  private ref(uid: string) { return doc(getFirestore(), 'users', uid, 'devices', this.prefs.deviceID); }

  /** Registers this install for `uid`. Safe to call repeatedly. */
  async register(uid: string): Promise<void> {
    if (this.uid === uid) return;
    this.stop();
    this.uid = uid;
    try {
      if (!(await this.requestPermission())) return; // they said no: nothing to register
      const messaging = getMessaging();
      if (Platform.OS === 'ios') await registerDeviceForRemoteMessages(messaging);
      await this.save(uid, await getToken(messaging));
      this.unsubscribe = onTokenRefresh(messaging, (token) => { if (this.uid === uid) void this.save(uid, token); });
    } catch (error) {
      this.uid = null; // try again next time
      AppLog.warning('account', "Couldn't set up background alerts", error);
    }
  }

  /** Called when the "Shopping trip alerts" switch changes. */
  async updateAlerts(): Promise<void> {
    const uid = this.uid;
    if (!uid) return;
    try {
      await setDoc(this.ref(uid), { alerts: this.alertsEnabled, updatedAt: new Date(), ...deviceLanguageField() }, { merge: true });
    } catch (error) {
      AppLog.warning('account', "Couldn't update alert settings", error);
    }
  }

  /** Signing out: stop sending alerts for this person to this phone. */
  async unregister(): Promise<void> {
    const uid = this.uid;
    this.stop();
    if (!uid) return;
    try {
      await deleteDoc(this.ref(uid));
      await deleteToken(getMessaging());
    } catch { /* offline: the server drops the token the first time a send fails */ }
  }

  private stop(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.uid = null;
  }

  private async save(uid: string, token: string): Promise<void> {
    await setDoc(this.ref(uid), { token, platform: Platform.OS, alerts: this.alertsEnabled, updatedAt: new Date(), ...deviceLanguageField() }, { merge: true });
  }
}
