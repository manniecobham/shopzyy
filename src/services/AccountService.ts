import {
  AppleAuthProvider, EmailAuthProvider, GoogleAuthProvider, createUserWithEmailAndPassword, deleteUser, getAuth, onAuthStateChanged,
  reauthenticateWithCredential, revokeToken, sendPasswordResetEmail, signInWithCredential, signInWithEmailAndPassword, signOut,
} from '@react-native-firebase/auth';
import { appleAuth } from '@invertase/react-native-apple-authentication';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { Observable } from '../lib/observable';
import type { UserProfile } from '../models/entities';
import { AppPreferences, StorageKeys } from './AppPreferences';
import { AppLog } from './AppLog';
import { demoIdentity, isDemo } from '../demo/demo';
import { UserFacingError } from './UserFacingError';

export type AccountPhase = 'loading' | 'welcome' | 'signIn' | 'needsProfile' | 'ready';

export class ReauthCancelled extends Error {}

export type SignInProvider = 'apple' | 'google' | 'password';

export class AccountService extends Observable {
  phase: AccountPhase = 'loading';
  uid: string | null = null;
  email: string | null = null;
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

  reloadFromPrefs(): void {
    this.userRecordName = this.prefs.userRecordName;
    this.profile = this.prefs.getJSON<UserProfile>(StorageKeys.profile);
    this.changed();
  }

  start(): void {
    if (this.started) return;
    this.started = true;
    if (isDemo) {
      // The demo account is ready from the start and has no sign-in to check.
      this.uid = 'demo';
      this.email = null;
      const demo = demoIdentity();
      this.userRecordName = demo.userKey;
      this.profile = demo.profile;
      this.prefs.setBool(StorageKeys.hasSeenWelcome, true);
      this.updatePhase();
      return;
    }
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

  refresh(): void { this.updatePhase(); }

  completeWelcome(): void {
    this.prefs.setBool(StorageKeys.hasSeenWelcome, true);
    this.updatePhase();
  }

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
      try { await GoogleSignin.signOut(); } catch {}
    });
  }

  get provider(): SignInProvider | null {
    const ids = getAuth().currentUser?.providerData.map((p) => p.providerId) ?? [];
    if (ids.includes('apple.com')) return 'apple';
    if (ids.includes('google.com')) return 'google';
    if (ids.includes('password')) return 'password';
    return null;
  }

  private appleAuthorizationCode: string | null = null;

  async reauthenticate(password?: string): Promise<void> {
    const user = getAuth().currentUser;
    if (!user) throw new Error('You are signed out.');
    try {
      switch (this.provider) {
        case 'apple': {
          const response = await appleAuth.performRequest({ requestedOperation: appleAuth.Operation.REFRESH });
          if (!response.identityToken) throw new Error('Apple did not return an identity token.');
          await reauthenticateWithCredential(user, AppleAuthProvider.credential(response.identityToken, response.nonce));
          this.appleAuthorizationCode = response.authorizationCode ?? null;
          return;
        }
        case 'google': {
          await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
          const result = await GoogleSignin.signIn();
          if (result.type !== 'success') throw new ReauthCancelled();
          if (!result.data.idToken) throw new Error('Google did not return an ID token.');
          await reauthenticateWithCredential(user, GoogleAuthProvider.credential(result.data.idToken));
          return;
        }
        case 'password': {
          if (!user.email || !password) throw new Error('Enter your password to continue.');
          await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, password));
          return;
        }
        default:
          throw new Error("Couldn't tell how you signed in. Sign out and back in, then try again.");
      }
    } catch (error) {
      const code = String((error as { code?: unknown })?.code ?? '');
      if (error instanceof ReauthCancelled || code === '1001' || code.includes('SIGN_IN_CANCELLED') || code === '-5') throw new ReauthCancelled();
      throw error;
    }
  }

  async deleteAccount(): Promise<void> {
    const user = getAuth().currentUser;
    if (!user) return;
    if (this.appleAuthorizationCode) {
      try { await revokeToken(getAuth(), this.appleAuthorizationCode); } catch (error) { AppLog.warning('account', "Couldn't revoke the Apple token", error); }
      this.appleAuthorizationCode = null;
    }
    await deleteUser(user);
  }

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
    AppLog.warning('account', 'Sign-in failed', error);
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
