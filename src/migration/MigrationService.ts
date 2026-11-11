import type { LegacyDefaults, LegacyStore } from '../../modules/shopzy-legacy';
import { parseLegacyStore, toWire, type DocEntry, type LegacyHouseholdSnapshot } from './legacyParser';

export interface MigrationDeps {
  readStore(): Promise<LegacyStore | null>;
  readDefaults(): Promise<LegacyDefaults>;
  /** The person's `users/{uid}` document, or null. */
  getUserDoc(uid: string): Promise<{ migrationState?: string; legacyUserKey?: string } | null>;
  setUserDoc(uid: string, data: Record<string, unknown>): Promise<void>;
  /** `claimLegacyHousehold` Cloud Function. */
  claim(payload: Record<string, unknown>): Promise<{ created: boolean }>;
  /** `importLegacyRecords` Cloud Function. */
  importRecords(payload: { householdID: string; kind: 'items' | 'purchases' | 'tripTotals'; docs: unknown[] }): Promise<{ created: number }>;
  appVersion: string;
  now(): Date;
}

export type MigrationState = 'alreadyDone' | 'none' | 'done';

export interface MigrationResult {
  state: MigrationState;
  /** The person's old CloudKit user key, which stays their key inside the migrated data. */
  userRecordName: string | null;
  defaults: LegacyDefaults;
  households: number;
  records: number;
}

export interface MigrationProgress { done: number; total: number }

const CHUNK = { items: 400, purchases: 500, tripTotals: 400 } as const;

/**
 * One-time move of a person's data from the original iOS app (CloudKit, mirrored in the local
 * SwiftData store) to Firebase. Runs on the first launch after the update, once the person has
 * signed in. Safe to repeat: the server only ever creates what is missing, so an interrupted run
 * resumes where it stopped and a late run can never overwrite newer data. The old data is only
 * read, never changed or deleted.
 */
export class MigrationService {
  constructor(private readonly deps: MigrationDeps) {}

  async run(uid: string, onProgress?: (p: MigrationProgress) => void): Promise<MigrationResult> {
    const existing = await this.deps.getUserDoc(uid);
    if (existing?.migrationState === 'done' || existing?.migrationState === 'none') {
      // On another phone, the person keeps the identity their migrated data is filed under.
      return { state: 'alreadyDone', userRecordName: existing.legacyUserKey ?? null, defaults: {}, households: 0, records: 0 };
    }

    const [rows, defaults] = await Promise.all([this.deps.readStore(), this.deps.readDefaults()]);
    const userKey = defaults.userRecordName ?? null;
    const data = rows ? parseLegacyStore(rows) : { households: [], recordCount: 0 };

    // A fresh install, an Android phone, or an old install that never signed in: nothing to move.
    if (!userKey || data.households.length === 0) {
      await this.deps.setUserDoc(uid, { migrationState: 'none', checkedAt: this.deps.now(), appVersion: this.deps.appVersion });
      return { state: 'none', userRecordName: userKey, defaults, households: 0, records: 0 };
    }

    let done = 0;
    const report = (n: number) => { done += n; onProgress?.({ done, total: data.recordCount }); };
    onProgress?.({ done: 0, total: data.recordCount });

    let moved = 0;
    for (const snapshot of data.households) {
      // Only households this person belongs to can be claimed.
      if (!snapshot.members.some((m) => m.id === userKey)) { report(1); continue; }
      await this.moveHousehold(snapshot, userKey, report);
      moved++;
    }

    await this.deps.setUserDoc(uid, {
      migrationState: 'done', migratedAt: this.deps.now(), appVersion: this.deps.appVersion, legacyUserKey: userKey, households: moved,
    });
    return { state: 'done', userRecordName: userKey, defaults, households: moved, records: data.recordCount };
  }

  private async moveHousehold(s: LegacyHouseholdSnapshot, userKey: string, report: (n: number) => void): Promise<void> {
    await this.deps.claim({
      householdID: s.householdID,
      userRecordName: userKey,
      household: toWire(s.household),
      banner: s.banner,
      members: toWire(s.members),
      options: toWire(s.options),
    });
    report(1 + s.members.length + s.options.length);

    for (const kind of ['items', 'purchases', 'tripTotals'] as const) {
      const entries: DocEntry[] = s[kind];
      for (let i = 0; i < entries.length; i += CHUNK[kind]) {
        const chunk = entries.slice(i, i + CHUNK[kind]);
        await this.deps.importRecords({ householdID: s.householdID, kind, docs: toWire(chunk) as unknown[] });
        report(chunk.length);
      }
    }
  }
}
