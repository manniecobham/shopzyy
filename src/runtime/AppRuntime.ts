import { DataStore } from '../data/DataStore';
import { FirestoreSync, type SyncStatus } from '../data/sync/FirestoreSync';
import { Observable } from '../lib/observable';
import { AccountService } from '../services/AccountService';
import { AppPreferences } from '../services/AppPreferences';
import { HouseholdService } from '../services/HouseholdService';
import { ShoppingListService } from '../services/ShoppingListService';
import { noopNotifier, type Notifier, type ServiceEnv } from '../services/ports';
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
  ready = false;

  private sync: FirestoreSync | null = null;
  private syncUID: string | null = null;

  constructor(notifier: Notifier = noopNotifier) {
    super();
    this.env = { store: this.store, sync: null, prefs: this.prefs, notifier };
    this.households = new HouseholdService(this.env);
    this.account.subscribe(() => this.onAccountChanged());
  }

  /** Loads preferences, then starts watching the sign-in state. */
  async start(): Promise<void> {
    await this.prefs.load();
    // Re-read values that depend on preferences now that they are loaded.
    this.account.userRecordName = this.prefs.userRecordName;
    this.account.start();
    this.ready = true;
    this.changed();
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
    const shouldSync = !!uid && (phase === 'needsProfile' || phase === 'ready');

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

  private startSync(uid: string): void {
    const sync = new FirestoreSync(this.store, uid, {
      onStatus: (s) => { this.syncStatus = s; this.changed(); },
      onHouseholdRemoved: (name) => AppNotice.show(
        `${name || 'This household'} is no longer available`,
        "It was deleted by its owner or you were removed from it, so it's been removed from this phone.",
      ),
      onRemoteChange: () => ShoppingListService.refreshRestockReminders(this.env),
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
