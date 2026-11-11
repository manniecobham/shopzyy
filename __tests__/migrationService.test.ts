import { MigrationService, type MigrationDeps } from '../src/migration/MigrationService';
import type { LegacyStore } from '../modules/shopzy-legacy';
import fixture from './fixtures/legacyStore.json';

const store = fixture as unknown as LegacyStore;

function setup(over: Partial<MigrationDeps> = {}, rows: LegacyStore | null = store, defaults = { userRecordName: '_owner123' }) {
  const calls = { claims: [] as Record<string, unknown>[], imports: [] as { kind: string; count: number }[], userDocs: [] as Record<string, unknown>[] };
  const deps: MigrationDeps = {
    readStore: async () => rows,
    readDefaults: async () => defaults,
    getUserDoc: async () => null,
    setUserDoc: async (_uid, data) => { calls.userDocs.push(data); },
    claim: async (p) => { calls.claims.push(p); return { created: true }; },
    importRecords: async (p) => { calls.imports.push({ kind: p.kind, count: p.docs.length }); return { created: p.docs.length }; },
    appVersion: '1.0.0',
    now: () => new Date(0),
    ...over,
  };
  return { svc: new MigrationService(deps), calls };
}

describe('MigrationService', () => {
  test('claims each household the person belongs to, imports its records, then marks the person done', async () => {
    const { svc, calls } = setup();
    const progress: number[] = [];
    const result = await svc.run('uid-1', (p) => progress.push(p.done));

    expect(result).toMatchObject({ state: 'done', userRecordName: '_owner123', households: 1 }); // Office has no member record for this person
    expect(calls.claims).toHaveLength(1);
    expect(calls.claims[0]).toMatchObject({ householdID: '11111111-2222-3333-4444-555555555555', userRecordName: '_owner123' });
    expect(calls.imports.map((i) => i.kind)).toEqual(['items', 'purchases', 'tripTotals']);
    expect(calls.userDocs.at(-1)).toMatchObject({ migrationState: 'done', legacyUserKey: '_owner123', households: 1 });
    expect(progress.at(-1)).toBeGreaterThan(0);
  });

  test('dates are sent in the wire format the Cloud Function revives', async () => {
    const { svc, calls } = setup();
    await svc.run('uid-1');
    const household = calls.claims[0].household as Record<string, unknown>;
    expect(household.createdAt).toEqual({ __date: expect.any(Number) });
  });

  test('a person already migrated is skipped without reading anything', async () => {
    const read = jest.fn();
    const { svc, calls } = setup({ getUserDoc: async () => ({ migrationState: 'done', legacyUserKey: '_owner123' }), readStore: read });
    const result = await svc.run('uid-1');
    expect(result.state).toBe('alreadyDone');
    expect(result.userRecordName).toBe('_owner123'); // a second phone adopts the same identity
    expect(read).not.toHaveBeenCalled();
    expect(calls.claims).toEqual([]);
  });

  test('a fresh install (no old store) is recorded as nothing to migrate', async () => {
    const { svc, calls } = setup({}, null, {} as never);
    expect((await svc.run('uid-1')).state).toBe('none');
    expect(calls.userDocs[0]).toMatchObject({ migrationState: 'none' });
  });

  test('a failed claim stops the run and leaves the person NOT marked done, so the next launch retries', async () => {
    const { svc, calls } = setup({ claim: async () => { throw Object.assign(new Error('offline'), { code: 'unavailable' }); } });
    await expect(svc.run('uid-1')).rejects.toThrow('offline');
    expect(calls.userDocs).toEqual([]);
  });

  test('large households are imported in chunks', async () => {
    const big = JSON.parse(JSON.stringify(store)) as LegacyStore;
    const template = big.purchases[0];
    big.purchases = Array.from({ length: 1200 }, (_, i) => ({ ...template, ZID: `00000000-0000-0000-0000-${String(i).padStart(12, '0')}` }));
    const { svc, calls } = setup({}, big);
    await svc.run('uid-1');
    expect(calls.imports.filter((i) => i.kind === 'purchases').map((i) => i.count)).toEqual([500, 500, 200]);
  });
});
