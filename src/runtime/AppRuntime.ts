import { DataStore } from '../data/DataStore';
import { FirestoreSync, type SyncStatus } from '../data/sync/FirestoreSync';
import { Observable } from '../lib/observable';
import { AccountService } from '../services/AccountService';
import { AppPreferences } from '../services/AppPreferences';
import { HouseholdService } from '../services/HouseholdService';
import { ShoppingListService } from '../services/ShoppingListService';
import { noopNotifier, type Notifier, type ServiceEnv } from '../services/ports';
import { AppNotice } from '../services/UserFacingError';

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
