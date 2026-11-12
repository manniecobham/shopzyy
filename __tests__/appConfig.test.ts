jest.mock('@react-native-firebase/firestore', () => ({ doc: jest.fn(), getDoc: jest.fn(), getFirestore: jest.fn() }));
jest.mock('expo-constants', () => ({ expoConfig: { version: '1.0.0' } }));

import { AppConfigService, compareVersions } from '../src/services/AppConfig';

const prefs = (initial?: unknown) => ({
  getJSON: () => initial ?? null,
  setJSON: jest.fn(),
}) as never;

describe('version comparison', () => {
  test('compares numerically, not as text', () => {
    expect(compareVersions('1.10.0', '1.9.2')).toBe(1);
    expect(compareVersions('1.0.0', '1.0.0')).toBe(0);
    expect(compareVersions('1.0', '1.0.1')).toBe(-1);
    expect(compareVersions('2.0.0', '1.99.99')).toBe(1);
  });
});

describe('AppConfigService', () => {
  test('an old build is told to update; a current one is not', () => {
    expect(new AppConfigService(prefs({ minimumVersion: '1.2.0' }), '1.1.9').updateRequired).toBe(true);
    expect(new AppConfigService(prefs({ minimumVersion: '1.2.0' }), '1.2.0').updateRequired).toBe(false);
    expect(new AppConfigService(prefs({}), '0.1.0').updateRequired).toBe(false);
  });

  test('the migration is on unless it is switched off', () => {
    expect(new AppConfigService(prefs({}), '1.0.0').migrationEnabled).toBe(true);
    expect(new AppConfigService(prefs({ migrationEnabled: false }), '1.0.0').migrationEnabled).toBe(false);
  });
});
