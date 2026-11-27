import { androidVersionFrom, iosVersionFrom, versionPatch } from '../functions/src/storeVersionsLogic';

describe('store versions', () => {
  test('reads the App Store version', () => {
    expect(iosVersionFrom({ results: [{ version: '1.2.1' }] })).toBe('1.2.1');
    expect(iosVersionFrom({ results: [] })).toBeNull();
    expect(iosVersionFrom({ results: [{ version: 'beta' }] })).toBeNull();
    expect(iosVersionFrom(null)).toBeNull();
  });

  test('reads the Play version from fully rolled-out releases only', () => {
    expect(androidVersionFrom({ releases: [{ name: '14 (1.2.1)', status: 'inProgress' }, { name: '13 (1.2.0)', status: 'completed' }] })).toBe('1.2.0');
    expect(androidVersionFrom({ releases: [{ name: '1.2.1', status: 'completed' }, { name: '1.10.0', status: 'completed' }] })).toBe('1.10.0');
    expect(androidVersionFrom({ releases: [{ name: 'Fix', status: 'completed' }] })).toBeNull();
    expect(androidVersionFrom({})).toBeNull();
  });

  test('only writes newer versions', () => {
    expect(versionPatch({}, { ios: '1.2.1', android: null })).toEqual({ latestVersionIos: '1.2.1' });
    expect(versionPatch({ latestVersionIos: '1.2.1', latestVersionAndroid: '1.2.0' }, { ios: '1.2.0', android: '1.2.1' })).toEqual({ latestVersionAndroid: '1.2.1' });
    expect(versionPatch({ latestVersionIos: '1.2.1' }, { ios: '1.2.1', android: null })).toEqual({});
  });
});
