import { DataStore } from '../data/DataStore';
import { FirestoreSync, type SyncStatus } from '../data/sync/FirestoreSync';
import { Observable } from '../lib/observable';
import { AccountService } from '../services/AccountService';
import { AppPreferences } from '../services/AppPreferences';
import { HouseholdService } from '../services/HouseholdService';
import { ShoppingListService } from '../services/ShoppingListService';
import type { ServiceEnv } from '../services/ports';
import { router } from 'expo-router';
import { AppState, Platform } from 'react-native';
import { ShopzyLegacy } from '../../modules/shopzy-legacy';
import { applyLegacyDefaults } from '../migration/legacyDefaults';
import { firebaseMigrationDeps } from '../migration/firebaseDeps';
import { MigrationService } from '../migration/MigrationService';
import { AppLog } from '../services/AppLog';
import { scanForRemotePurchases } from '../services/ActivityMonitor';
import { NotificationService } from '../services/NotificationService';
import { getFunctions, httpsCallable } from '@react-native-firebase/functions';
import { StorageKeys } from '../services/AppPreferences';
import { AppNotice, UserFacingError } from '../services/UserFacingError';

/**
 * Composition root: owns the store, preferences, account and sync, and starts/stops sync as
 * the person signs in and out (the role ShopzyApp + RootView played in the Swift app).
 */
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
  ready = false;

  private sync: FirestoreSync | null = null;
  private syncUID: string | null = null;

  readonly notifications = new NotificationService(this.prefs);

  constructor() {
    super();
    this.env = { store: this.store, sync: null, prefs: this.prefs, notifier: this.notifications };
    this.households = new HouseholdService(this.env);
    this.account.subscribe(() => this.onAccountChanged());
  }

  /** Loads preferences, then starts watching the sign-in state. */
  async start(): Promise<void> {
    await this.prefs.load();
    await AppLog.load();
    // First launch after updating from the original iOS app: adopt who they were and their settings,
    // so they skip the welcome and profile screens and only need to sign in.
    if (Platform.OS === 'ios') {
      const legacy = await ShopzyLegacy.readDefaults().catch(() => ({}));
      applyLegacyDefaults(this.prefs, legacy);
    } else {
      applyLegacyDefaults(this.prefs, {});
    }
    this.account.reloadFromPrefs();
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
  async deleteMyData(): Promise<string | null> {
    try {
      await this.households.deleteMyData();
      try { await this.account.deleteAccount(); } catch { await this.account.signOut(); } // e.g. needs a recent sign-in
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
      if (error) AppNotice.show("Couldn't join the household", error);
    });
  }

  list(householdID: string): ShoppingListService {
    return new ShoppingListService(this.env, householdID);
  }

  /** Sync starts as soon as someone is signed in, before the profile is set, so a person setting up a new device sees their households arrive. */
  private onAccountChanged(): void {
    const { phase, uid } = this.account;
    if (this.migrationUID !== uid) {
      this.migrationUID = uid;
      this.migration = { state: 'idle', message: null, progress: null };
    }
    if (uid && this.migration.state === 'idle') void this.runMigration(uid);
    // Households only appear once the migration has moved them, so sync waits for it.
    const shouldSync = !!uid && this.migration.state === 'done' && (phase === 'needsProfile' || phase === 'ready');

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
  async runMigration(uid: string): Promise<void> {
    if (this.migration.state === 'running') return;
    const marker = `shopzy.migrated.${uid}`;
    if (Platform.OS !== 'ios' || this.prefs.getString(marker)) {
      this.migration = { state: 'done', message: null, progress: null };
      this.onAccountChanged();
      return;
    }
    this.migration = { state: 'running', message: null, progress: null };
    this.changed();
    try {
      const result = await new MigrationService(firebaseMigrationDeps()).run(uid, (progress) => {
        this.migration = { ...this.migration, progress };
        this.changed();
      });
      // Keep the identity the data is filed under (the old CloudKit user key).
      if (result.userRecordName && result.userRecordName !== this.account.userRecordName) this.account.setUserRecordName(result.userRecordName);
      this.prefs.setString(marker, '1');
      this.migration = { state: 'done', message: null, progress: null };
      this.onAccountChanged();
    } catch (error) {
      AppLog.error('account', 'Moving the data from the old app failed', error);
      this.migration = { state: 'failed', message: UserFacingError.message(error), progress: null };
      this.changed();
    }
  }

  retryMigration(): void {
    const uid = this.account.uid;
    if (!uid) return;
    this.migration = { state: 'idle', message: null, progress: null };
    this.onAccountChanged();
  }

  private startSync(uid: string): void {
    const sync = new FirestoreSync(this.store, uid, {
      onStatus: (s) => { this.syncStatus = s; this.changed(); },
      onHouseholdRemoved: (name) => AppNotice.show(
        `${name || 'This household'} is no longer available`,
        "It was deleted by its owner or you were removed from it, so it's been removed from this phone.",
      ),
      onRemoteChange: () => {
        // Handled here, not in a screen: when the app is woken in the background no screen exists.
        this.scanActivity();
        ShoppingListService.refreshRestockReminders(this.env);
      },
      onFetched: () => {
        const { profile, userRecordName } = this.account;
        if (profile && userRecordName) this.households.updateProfile(profile, userRecordName);
      },
    });
    this.sync = sync;
    this.syncUID = uid;
    this.env.sync = sync;
    sync.start();
  }

  private stopSync(): void {
    this.sync?.stop();
    this.sync = null;
    this.syncUID = null;
    this.env.sync = null;
  }
}
