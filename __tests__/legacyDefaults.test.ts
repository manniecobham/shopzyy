import { LEGACY_APPLIED_KEY, applyLegacyDefaults, type PrefsWriter } from '../src/migration/legacyDefaults';
import { StorageKeys } from '../src/services/storageKeys';

function prefs() {
  const m = new Map<string, unknown>();
  const p: PrefsWriter & { m: Map<string, unknown> } = {
    m,
    getString: (k) => (typeof m.get(k) === 'string' ? (m.get(k) as string) : null),
    setString: (k, v) => { if (v === null) m.delete(k); else m.set(k, v); },
    setBool: (k, v) => { m.set(k, v); },
    setJSON: (k, v) => { m.set(k, v); },
  };
  return p;
}

describe('applyLegacyDefaults', () => {
  const old = {
    userRecordName: '_owner123', hasSeenWelcome: true, deviceID: 'DEV-1', currentHouseholdID: '11111111-2222-3333-4444-555555555555',
    profile: '{"name":"Ada","emoji":"👩🏾","colorHex":"#0A84FF"}', notifyPurchases: false, announcedTrips: { 't': 3 },
  };

  test('carries identity, profile and settings over once', () => {
    const p = prefs();
    expect(applyLegacyDefaults(p, old)).toBe(true);
    expect(p.m.get(StorageKeys.userRecordName)).toBe('_owner123');
    expect(p.m.get(StorageKeys.hasSeenWelcome)).toBe(true);
    expect(p.m.get(StorageKeys.profile)).toEqual({ name: 'Ada', emoji: '👩🏾', colorHex: '#0A84FF' });
    expect(p.m.get(StorageKeys.deviceID)).toBe('DEV-1');
    expect(p.m.get(StorageKeys.notifyPurchases)).toBe(false);
    expect(p.m.get(StorageKeys.currentHouseholdID)).toBe('11111111-2222-3333-4444-555555555555');
    expect(p.m.get(StorageKeys.announcedTrips)).toEqual({ t: 3 });
  });

  test('never runs twice, so later edits in the new app are not overwritten', () => {
    const p = prefs();
    applyLegacyDefaults(p, old);
    p.m.set(StorageKeys.profile, { name: 'Changed', emoji: '🐱', colorHex: '#FF375F' });
    expect(applyLegacyDefaults(p, old)).toBe(false);
    expect((p.m.get(StorageKeys.profile) as { name: string }).name).toBe('Changed');
  });

  test('a phone that never had the old set up applies nothing but is still marked checked', () => {
    const p = prefs();
    expect(applyLegacyDefaults(p, {})).toBe(false);
    expect(p.m.get(LEGACY_APPLIED_KEY)).toBe('1');
    expect(p.m.has(StorageKeys.userRecordName)).toBe(false);
  });

  test('a corrupt profile is ignored rather than crashing', () => {
    const p = prefs();
    expect(() => applyLegacyDefaults(p, { ...old, profile: '{nope' })).not.toThrow();
    expect(p.m.has(StorageKeys.profile)).toBe(false);
  });
});
