import { READY_DAYS, adoptionDelta, nest, readiness } from '../functions/src/adoptionLogic';

describe('adoption counters', () => {
  test('a new user adds to every counter', () => {
    expect(adoptionDelta(undefined, { migrationState: 'done', appVersion: '1.0.0', platform: 'ios' }))
      .toEqual({ users: 1, 'state.done': 1, 'version.1_0_0': 1, 'platform.ios': 1 });
  });

  test('a user who finishes migrating and updates moves between counters without changing the total', () => {
    expect(adoptionDelta({ migrationState: 'none', appVersion: '1.0.0', platform: 'ios' }, { migrationState: 'done', appVersion: '1.1.0', platform: 'ios' }))
      .toEqual({ 'state.none': -1, 'state.done': 1, 'version.1_0_0': -1, 'version.1_1_0': 1 });
  });

  test('an unchanged document changes nothing', () => {
    const u = { migrationState: 'done', appVersion: '1.0.0', platform: 'ios' };
    expect(adoptionDelta(u, { ...u })).toEqual({});
  });

  test('a deleted user is subtracted', () => {
    expect(adoptionDelta({ migrationState: 'done', appVersion: '1.0.0' }, undefined)).toMatchObject({ users: -1, 'state.done': -1 });
  });

  test('dotted keys become nested objects for Firestore', () => {
    expect(nest({ users: 1, 'state.done': 2 }, (n) => `+${n}`)).toEqual({ users: '+1', state: { done: '+2' } });
  });
});

describe('migration readiness', () => {
  const day = 86_400_000;
  const now = Date.UTC(2027, 0, 1);

  test('ready only when nearly everyone moved, enough time passed and migrations have dried up', () => {
    const r = readiness({ migrated: 995, estimate: 1000, firstMigratedAtMs: now - (READY_DAYS + 5) * day, migratedLast7d: 0, nowMs: now });
    expect(r).toMatchObject({ percent: 99.5, ready: true, reasons: [] });
  });

  test('not ready early, and the reasons say why', () => {
    const r = readiness({ migrated: 400, estimate: 1000, firstMigratedAtMs: now - 10 * day, migratedLast7d: 120, nowMs: now });
    expect(r.ready).toBe(false);
    expect(r.reasons).toHaveLength(3);
  });

  test('without an estimate it asks for one instead of guessing', () => {
    const r = readiness({ migrated: 50, estimate: null, firstMigratedAtMs: now - 200 * day, migratedLast7d: 0, nowMs: now });
    expect(r.percent).toBeNull();
    expect(r.ready).toBe(false);
    expect(r.reasons[0]).toContain('legacyUserEstimate');
  });

  test('a late trickle of migrations keeps it from being declared ready', () => {
    const r = readiness({ migrated: 1000, estimate: 1000, firstMigratedAtMs: now - 200 * day, migratedLast7d: 40, nowMs: now });
    expect(r.ready).toBe(false);
  });
});
