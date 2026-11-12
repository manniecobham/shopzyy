import { t } from '../i18n';
import { DataStore } from '../data/DataStore';
import { FirestoreSync, type SyncStatus } from '../data/sync/FirestoreSync';
import { Observable } from '../lib/observable';
import { AccountService, ReauthCancelled } from '../services/AccountService';
import { AppPreferences } from '../services/AppPreferences';
import { HouseholdService } from '../services/HouseholdService';
import { ShoppingListService } from '../services/ShoppingListService';
import type { ServiceEnv } from '../services/ports';
import { router } from 'expo-router';
import { AppState, Platform } from 'react-native';
import { ShopzyLegacy } from '../../modules/shopzy-legacy';
import { HAD_LEGACY_APP_KEY, applyLegacyDefaults } from '../migration/legacyDefaults';
import { firebaseMigrationDeps } from '../migration/firebaseDeps';
import { MigrationService, type MigrationResult } from '../migration/MigrationService';
import { AppLog } from '../services/AppLog';
import { scanForRemotePurchases } from '../services/ActivityMonitor';
import { NotificationService } from '../services/NotificationService';
import { PushRegistration } from '../services/PushRegistration';
import { isDemo, seedDemo } from '../demo/demo';
import { AppConfigService, appVersion } from '../services/AppConfig';
import { deleteDoc, doc, getFirestore, setDoc } from '@react-native-firebase/firestore';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import { StorageKeys } from '../services/AppPreferences';
import { AppNotice, UserFacingError } from '../services/UserFacingError';

/**
 * Composition root: owns the store, preferences, account and sync, and starts/stops sync as
 * the person signs in and out (the role ShopzyApp + RootView played in the Swift app).
 */
/** Returned by `deleteMyData` when the person closed the Apple/Google sheet: nothing was deleted and no message is needed. */
export const DELETE_CANCELLED = 'cancelled';

export class AppRuntime extends Observable {
  readonly prefs = new AppPreferences();
  readonly store = new DataStore();
  readonly account = new AccountService(this.prefs);
  readonly env: ServiceEnv;
  readonly households: HouseholdService;
  syncStatus: SyncStatus = { state: 'idle' };
  /** The one-time move from the original iOS app's data. Sync waits until it is done. */
  migration: { state: 'idle' | 'running' | 'failed' | 'done'; message: string | null; progress: { done: number; total: number } | null } =
    { state: 'idle', message: null, progress: null };
  private migrationUID: string | null = null;
  /** False from the moment sync starts until the first households arrive (or a short timeout), so we show a loader instead of flashing "create a household". */
  initialSyncDone = false;
  private initialSyncTimer: ReturnType<typeof setTimeout> | null = null;
  ready = false;

  private sync: FirestoreSync | null = null;
  private syncUID: string | null = null;

  readonly notifications = new NotificationService(this.prefs);
  readonly appConfig = new AppConfigService(this.prefs);
  readonly push = new PushRegistration(this.prefs, () => this.notifications.requestAuthorization());

  constructor() {
    super();
    this.env = { store: this.store, sync: null, prefs: this.prefs, notifier: this.notifications };
    this.households = new HouseholdService(this.env);
    this.account.subscribe(() => this.onAccountChanged());
  }

  /** Loads preferences, then starts watching the sign-in state. */
  async start(): Promise<void> {
    await this.prefs.load();
    if (isDemo) {
      // In memory only: no sign-in, sync, migration, push or remote config.
      this.migration = { state: 'done', message: null, progress: null };
      this.initialSyncDone = true;
      this.prefs.currentHouseholdID = seedDemo(this.env);
      this.account.start();
      this.ready = true;
      this.changed();
      return;
    }
    await AppLog.load();
    // First launch after updating from the original iOS app: adopt who they were and their settings,
    // so they skip the welcome and profile screens and only need to sign in.
    if (Platform.OS === 'ios') {
      // Only when this build can actually read them: otherwise "nothing found" would be remembered forever.
      if (ShopzyLegacy.isAvailable) {
        const legacy = await ShopzyLegacy.readDefaults().catch(() => ({}));
        applyLegacyDefaults(this.prefs, legacy);
      }
    } else {
      applyLegacyDefaults(this.prefs, {});
    }
    this.account.reloadFromPrefs();
    this.appConfig.reloadFromCache();
    void this.appConfig.refresh();
    this.appConfig.subscribe(() => this.changed());
    this.wireNotifications();
    // Re-read values that depend on preferences now that they are loaded.
    this.account.userRecordName = this.prefs.userRecordName;
    this.account.start();
    this.ready = true;
    this.changed();
    // Whenever the app comes back to the foreground: catch up on trips, reminders and queued error reports.
    AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      this.account.refresh();
      void this.appConfig.refresh();
      this.scanActivity();
      ShoppingListService.refreshRestockReminders(this.env);
      void AppLog.uploadPending();
    });
  }

  /** Wired here (not in a screen) so "Add to list" works even when a notification action wakes the app in the background. */
  private wireNotifications(): void {
    const n = this.notifications;
    void n.configure();
    n.onAddToList = (itemID) => ShoppingListService.forItem(itemID, this.env)?.addToList(itemID);
    n.onSnooze = (itemID) => ShoppingListService.forItem(itemID, this.env)?.snooze(itemID, 7);
    n.onOpenActivity = () => router.navigate('/activity');
  }

  scanActivity(): void { scanForRemotePurchases(this.env, this.prefs); }

  /** Restarts the listeners, e.g. from "Sync now" in Settings. */
  restartSync(): void {
    const uid = this.account.uid;
    this.stopSync();
    if (uid) this.startSync(uid);
    this.changed();
  }

  /**
   * "Delete my data": owned households are deleted for everyone, joined ones are left, the account
   * is removed and the app returns to the welcome screen.
   */
  async deleteMyData(password?: string): Promise<string | null> {
    // Confirm it's them first, so a stale sign-in can never leave the account behind after the data is gone.
    try {
      await this.account.reauthenticate(password);
    } catch (error) {
      if (error instanceof ReauthCancelled) return DELETE_CANCELLED;
      AppLog.warning('account', "Couldn't confirm the account before deleting", error);
      return UserFacingError.message(error);
    }
    try {
      const uid = this.account.uid;
      await this.households.deleteMyData();
      await this.push.unregister();
      if (uid) { try { await deleteDoc(doc(getFirestore(), 'users', uid)); } catch { /* the account is deleted next either way */ } }
      await this.account.deleteAccount();
      this.account.reset();
      this.prefs.currentHouseholdID = null;
      return null;
    } catch (error) {
      AppLog.error('account', "Delete my data didn't finish", error);
      return UserFacingError.message(error);
    }
  }

  // MARK: Selection and invites

  /** The household shown now: the saved choice if it still exists, else the first one. */
  get currentHousehold() {
    const all = this.store.allHouseholds();
    return all.find((h) => h.id === this.prefs.currentHouseholdID) ?? all[0] ?? null;
  }

  selectHousehold(id: string): void {
    this.prefs.currentHouseholdID = id;
    this.changed();
  }

  /** Joins the household behind an invite code. Resolves to an error message, or null on success. */
  async joinHousehold(code: string): Promise<string | null> {
    try {
      const result = await httpsCallable<{ code: string }, { householdID: string }>(getFunctions(), 'joinHousehold')({ code: code.trim() });
      this.store.removedHouseholds.delete(result.data.householdID);
      this.selectHousehold(result.data.householdID);
      return null;
    } catch (error) {
      return UserFacingError.message(error);
    }
  }

  /** Asks for a shareable invite code for a household this person belongs to. */
  async createInvite(householdID: string): Promise<{ code: string } | { error: string }> {
    try {
      const result = await httpsCallable<{ householdID: string }, { code: string }>(getFunctions(), 'createInvite')({ householdID });
      return { code: result.data.code };
    } catch (error) {
      return { error: UserFacingError.message(error) };
    }
  }

  /** An invite link opened before the person was signed in is kept and redeemed once they're ready. */
  async handleInviteLink(code: string): Promise<string | null> {
    if (this.account.phase === 'ready') return this.joinHousehold(code);
    this.prefs.setString(StorageKeys.pendingInvite, code);
    return null;
  }

  private redeemPendingInvite(): void {
    const code = this.prefs.getString(StorageKeys.pendingInvite);
    if (!code) return;
    this.prefs.remove(StorageKeys.pendingInvite);
    void this.joinHousehold(code).then((error) => {
      if (error) AppNotice.show(t("Couldn't join the household"), error);
    });
  }

  list(householdID: string): ShoppingListService {
    return new ShoppingListService(this.env, householdID);
  }

  /** Sync starts as soon as someone is signed in, before the profile is set, so a person setting up a new device sees their households arrive. */
  private onAccountChanged(): void {
    if (isDemo) { this.changed(); return; }
    const { phase, uid } = this.account;
    if (this.migrationUID !== uid) {
      this.migrationUID = uid;
      this.migration = { state: 'idle', message: null, progress: null };
    }
    if (uid && this.migration.state === 'idle') void this.runMigration(uid);
    // Households only appear once the migration has moved them, so sync waits for it.
    const shouldSync = !!uid && this.migration.state === 'done' && (phase === 'needsProfile' || phase === 'ready');

    // Background alerts: register this phone once the person is set up; drop it on sign-out.
    if (uid && this.migration.state === 'done' && phase === 'ready') {
      void this.push.register(uid);
      this.reportVersion(uid);
    }
    if (!uid) void this.push.unregister();

    if (!uid && this.sync) {
      // Another person's households must not stay on this device.
      this.stopSync();
      this.households.eraseEverything();
      this.prefs.currentHouseholdID = null;
    } else if (shouldSync && (!this.sync || this.syncUID !== uid)) {
      this.stopSync();
      this.startSync(uid);
    }

    if (phase === 'ready' && this.account.profile && this.account.userRecordName) {
      this.households.updateProfile(this.account.profile, this.account.userRecordName);
      this.redeemPendingInvite();
    }
    this.changed();
  }

  /** Moves the old app's data to Firebase (iPhone only). Safe to retry. */
  async runMigration(uid: string, options: { force?: boolean } = {}): Promise<MigrationResult | null> {
    if (this.migration.state === 'running') return null;
    const marker = `shopzy.migrated.${uid}`;
    // The migration can be switched off remotely (config/app.migrationEnabled) once it is no longer wanted.
    if (!options.force && (Platform.OS !== 'ios' || this.prefs.getString(marker) || !this.appConfig.migrationEnabled)) {
      this.migration = { state: 'done', message: null, progress: null };
      this.onAccountChanged();
      return null;
    }
    this.migration = { state: 'running', message: null, progress: null };
    this.changed();
    try {
      const result = await new MigrationService(firebaseMigrationDeps()).run(uid, (progress) => {
        this.migration = { ...this.migration, progress };
        this.changed();
      }, options);
      // Keep the identity the data is filed under (the old CloudKit user key).
      if (result.userRecordName && result.userRecordName !== this.account.userRecordName) this.account.setUserRecordName(result.userRecordName);
      if (result.state === 'done' && result.households > 0) this.prefs.setString(HAD_LEGACY_APP_KEY, '1');
      // Remember only results we can trust: a "nothing to move" from a build without the reader must be re-checked next launch.
      if (result.state !== 'none' || result.reliable) this.prefs.setString(marker, '1');
      this.migration = { state: 'done', message: null, progress: null };
      this.onAccountChanged();
      return result;
    } catch (error) {
      AppLog.error('account', 'Moving the data from the old app failed', error);
      this.migration = { state: 'failed', message: UserFacingError.message(error), progress: null };
      this.changed();
      return null;
    }
  }

  /** Settings → "Import from the old Shopzy app": runs the migration again, ignoring what was recorded before. */
  async importFromOldApp(): Promise<MigrationResult | null> {
    const uid = this.account.uid;
    if (!uid) return null;
    return this.runMigration(uid, { force: true });
  }

  private versionReportedFor: string | null = null;

  /** Once per launch: record which app version and platform this person is on (feeds the adoption counters). */
  private reportVersion(uid: string): void {
    if (this.versionReportedFor === uid) return;
    this.versionReportedFor = uid;
    void setDoc(doc(getFirestore(), 'users', uid), { appVersion: appVersion(), platform: Platform.OS, lastSeenAt: new Date() }, { merge: true }).catch(() => {
      this.versionReportedFor = null;
    });
  }

  retryMigration(): void {
    const uid = this.account.uid;
    if (!uid) return;
    this.migration = { state: 'idle', message: null, progress: null };
    this.onAccountChanged();
  }

  private startSync(uid: string): void {
    this.initialSyncDone = false;
    if (this.initialSyncTimer) clearTimeout(this.initialSyncTimer);
    this.initialSyncTimer = setTimeout(() => this.markInitialSyncDone(), 6000); // never wait forever (offline, slow network)
    const sync = new FirestoreSync(this.store, uid, {
      onStatus: (s) => { this.syncStatus = s; if (s.state === 'offline' || s.state === 'failed') this.markInitialSyncDone(); this.changed(); },
      onHouseholdRemoved: (name) => AppNotice.show(
        name ? t('{name} is no longer available', { name }) : t('This household is no longer available'),
        t("It was deleted by its owner or you were removed from it, so it's been removed from this phone."),
      ),
      onRemoteChange: () => {
        // Handled here, not in a screen: when the app is woken in the background no screen exists.
        this.scanActivity();
        ShoppingListService.refreshRestockReminders(this.env);
      },
      onFetched: () => {
        this.markInitialSyncDone();
        const { profile, userRecordName } = this.account;
        if (profile && userRecordName) this.households.updateProfile(profile, userRecordName);
      },
    });
    this.sync = sync;
    this.syncUID = uid;
    this.env.sync = sync;
    sync.start();
  }

  private markInitialSyncDone(): void {
    if (this.initialSyncTimer) { clearTimeout(this.initialSyncTimer); this.initialSyncTimer = null; }
    if (this.initialSyncDone) return;
    this.initialSyncDone = true;
    this.changed();
  }

  private stopSync(): void {
    this.initialSyncDone = false;
    this.sync?.stop();
    this.sync = null;
    this.syncUID = null;
    this.env.sync = null;
  }
}
