jest.mock('@react-native-firebase/auth', () => ({ getAuth: () => ({}), onAuthStateChanged: jest.fn() }));
jest.mock('@invertase/react-native-apple-authentication', () => ({ appleAuth: {} }));
jest.mock('@react-native-google-signin/google-signin', () => ({ GoogleSignin: { configure: jest.fn() } }));
jest.mock('../src/services/AppLog', () => ({ AppLog: { error: jest.fn(), warning: jest.fn(), info: jest.fn() } }));
jest.mock('expo-constants', () => ({ expoConfig: { extra: {} } }));
jest.mock('@react-native-async-storage/async-storage', () => ({ multiGet: async () => [], setItem: async () => {}, removeItem: async () => {}, multiSet: async () => {} }));

import { AccountService } from '../src/services/AccountService';
import { AppPreferences, StorageKeys } from '../src/services/AppPreferences';

describe('first-launch tour', () => {
  it('is pending for someone who already passed the welcome step before the tour existed', () => {
    const prefs = new AppPreferences();
    prefs.setBool(StorageKeys.hasSeenWelcome, true);
    expect(prefs.getBool(StorageKeys.hasSeenTour, false)).toBe(false);
  });

  it('a new install that finishes the welcome pages does not see the tour again', () => {
    const prefs = new AppPreferences();
    new AccountService(prefs).completeWelcome();
    expect(prefs.getBool(StorageKeys.hasSeenWelcome, false)).toBe(true);
    expect(prefs.getBool(StorageKeys.hasSeenTour, false)).toBe(true);
  });

  it('deleting your data brings the tour back for the next sign-up', () => {
    const prefs = new AppPreferences();
    const account = new AccountService(prefs);
    account.completeWelcome();
    account.reset();
    expect(prefs.getBool(StorageKeys.hasSeenTour, false)).toBe(false);
  });
});
