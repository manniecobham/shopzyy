import {
  AppleAuthProvider, GoogleAuthProvider, createUserWithEmailAndPassword, deleteUser, getAuth, onAuthStateChanged,
  sendPasswordResetEmail, signInWithCredential, signInWithEmailAndPassword, signOut,
} from '@react-native-firebase/auth';
import { appleAuth } from '@invertase/react-native-apple-authentication';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { Observable } from '../lib/observable';
import type { UserProfile } from '../models/entities';
import { AppPreferences, StorageKeys } from './AppPreferences';
import { UserFacingError } from './UserFacingError';

/**
 * Where a person is in getting set up. The Swift app's `needsICloud` becomes `signIn`:
 * the iCloud identity is replaced by a Firebase account (Apple, Google or email).
 */
export type AccountPhase = 'loading' | 'welcome' | 'signIn' | 'needsProfile' | 'ready';

/** The person using Shopzyy: their sign-in and their profile. */
export class AccountService extends Observable {
  phase: AccountPhase = 'loading';
  /** Firebase uid, or null when signed out. */
  uid: string | null = null;
  email: string | null = null;
  /**
   * The stable id other people's data refers to (members, section keys, trip totals). It is the
   * Firebase uid, except for people migrated from the iOS app, who keep their old CloudKit
   * record name so everything stored under it still matches.
   */
  userRecordName: string | null;
  profile: UserProfile | null;
  lastError: string | null = null;
  busy = false;

  private started = false;

  constructor(private readonly prefs: AppPreferences) {
    super();
    this.userRecordName = prefs.userRecordName;
    this.profile = prefs.getJSON<UserProfile>(StorageKeys.profile);
  }

  private get hasSeenWelcome(): boolean { return this.prefs.getBool(StorageKeys.hasSeenWelcome, false); }

  /** Starts listening for sign-in changes. Call once at launch, after preferences have loaded. */
  start(): void {
    if (this.started) return;
    this.started = true;
    GoogleSignin.configure({ webClientId: (Constants.expoConfig?.extra?.googleWebClientId as string) || undefined });
    onAuthStateChanged(getAuth(), (user) => {
      this.uid = user?.uid ?? null;
      this.email = user?.email ?? null;
      if (user) {
        // A different person than last time on this device: don't inherit their identity.
        if (this.prefs.getString('shopzy.lastUID') && this.prefs.getString('shopzy.lastUID') !== user.uid) {
          this.userRecordName = null;
          this.profile = null;
          this.prefs.remove(StorageKeys.profile);
          this.prefs.remove(StorageKeys.currentHouseholdID);
        }
        this.prefs.setString('shopzy.lastUID', user.uid);
        this.setUserRecordName(this.userRecordName ?? user.uid);
      }
      this.updatePhase();
    });
  }

  /** Re-checks every requirement. Call when the app becomes active. */
  refresh(): void { this.updatePhase(); }

  completeWelcome(): void {
    this.prefs.setBool(StorageKeys.hasSeenWelcome, true);
    this.updatePhase();
  }

  /** Migration sets the person's old CloudKit record name as their stable key. */
  setUserRecordName(key: string): void {
    this.userRecordName = key;
    this.prefs.userRecordName = key;
    this.changed();
  }

  saveProfile(profile: UserProfile): void {
    this.profile = profile;
    this.prefs.setJSON(StorageKeys.profile, profile);
    this.updatePhase();
  }

  // MARK: Sign in

  async signInWithApple(): Promise<void> {
    if (Platform.OS !== 'ios' || !appleAuth.isSupported) return this.fail(new Error('Sign in with Apple is not available here.'));
    await this.run(async () => {
      const response = await appleAuth.performRequest({
        requestedOperation: appleAuth.Operation.LOGIN,
        requestedScopes: [appleAuth.Scope.EMAIL, appleAuth.Scope.FULL_NAME],
      });
      if (!response.identityToken) throw new Error('Apple did not return an identity token.');
      const credential = AppleAuthProvider.credential(response.identityToken, response.nonce);
      await signInWithCredential(getAuth(), credential);
      // Apple only sends the name the first time; use it to suggest a profile name.
      const given = response.fullName?.givenName;
      if (given && !this.profile) this.suggestedName = given;
    });
  }

  /** A name to pre-fill on the profile screen (e.g. from Apple). */
  suggestedName: string | null = null;

  async signInWithGoogle(): Promise<void> {
    await this.run(async () => {
      await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
      const result = await GoogleSignin.signIn();
      if (result.type !== 'success') return; // cancelled
      const idToken = result.data.idToken;
      if (!idToken) throw new Error('Google did not return an ID token.');
      await signInWithCredential(getAuth(), GoogleAuthProvider.credential(idToken));
      if (result.data.user.givenName && !this.profile) this.suggestedName = result.data.user.givenName;
    });
  }

  async signInWithEmail(email: string, password: string): Promise<void> {
    await this.run(() => signInWithEmailAndPassword(getAuth(), email.trim(), password).then(() => undefined));
  }

  async signUpWithEmail(email: string, password: string): Promise<void> {
    await this.run(() => createUserWithEmailAndPassword(getAuth(), email.trim(), password).then(() => undefined));
  }

  async resetPassword(email: string): Promise<boolean> {
    let ok = false;
    await this.run(async () => { await sendPasswordResetEmail(getAuth(), email.trim()); ok = true; });
    return ok;
  }

  // MARK: Sign out / delete

  async signOut(): Promise<void> {
    await this.run(async () => {
      await signOut(getAuth());
      try { await GoogleSignin.signOut(); } catch { /* not signed in with Google */ }
    });
  }

  /** Deletes the Firebase account itself (after the person's household data is deleted). */
  async deleteAccount(): Promise<void> {
    const user = getAuth().currentUser;
    if (user) await deleteUser(user);
  }

  /**
   * Forgets everything about this person on this device, after their household data was
   * deleted, and returns to the welcome screen.
   */
  reset(): void {
    this.profile = null;
    this.lastError = null;
    for (const key of [StorageKeys.profile, StorageKeys.currentHouseholdID, StorageKeys.announcedTrips, StorageKeys.skippedTrips,
      StorageKeys.selectedTab, StorageKeys.hasSeenWelcome]) this.prefs.remove(key);
    this.updatePhase();
  }

  // MARK: Internals

  private async run(action: () => Promise<void>): Promise<void> {
    this.busy = true;
    this.lastError = null;
    this.changed();
    try {
      await action();
    } catch (error) {
      this.fail(error);
    } finally {
      this.busy = false;
      this.changed();
    }
  }

  private fail(error: unknown): void {
    const code = String((error as { code?: unknown })?.code ?? '');
    // Closing the Apple/Google sheet isn't an error worth showing.
    if (code === '1001' || code.includes('SIGN_IN_CANCELLED') || code === '-5') return;
    this.lastError = UserFacingError.message(error);
    this.changed();
  }

  private updatePhase(): void {
    if (!this.hasSeenWelcome) this.phase = 'welcome';
    else if (!this.uid) this.phase = 'signIn';
    else this.phase = this.profile ? 'ready' : 'needsProfile';
    this.changed();
  }
}
