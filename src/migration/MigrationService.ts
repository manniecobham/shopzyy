import type { LegacyDefaults, LegacyStore } from '../../modules/shopzy-legacy';
import { parseLegacyStore, toWire, type DocEntry, type LegacyHouseholdSnapshot } from './legacyParser';

export interface MigrationDeps {
  readStore(): Promise<LegacyStore | null>;
  readDefaults(): Promise<LegacyDefaults>;
  getUserDoc(uid: string): Promise<{ migrationState?: string; legacyUserKey?: string } | null>;
  setUserDoc(uid: string, data: Record<string, unknown>): Promise<void>;
  claim(payload: Record<string, unknown>): Promise<{ created: boolean }>;
  importRecords(payload: { householdID: string; kind: 'items' | 'purchases' | 'tripTotals'; docs: unknown[] }): Promise<{ created: number }>;
  legacyAvailable: boolean;
  log?(message: string): void;
  appVersion: string;
  environment: string;
  now(): Date;
}

export type MigrationState = 'alreadyDone' | 'none' | 'done';

export interface MigrationOptions {
  force?: boolean;
}

export interface MigrationResult {
  state: MigrationState;
  reliable: boolean;
  userRecordName: string | null;
  defaults: LegacyDefaults;
  households: number;
  records: number;
}

export interface MigrationProgress { done: number; total: number }

const CHUNK = { items: 400, purchases: 500, tripTotals: 400 } as const;

export class MigrationService {
  constructor(private readonly deps: MigrationDeps) {}

  async run(uid: string, onProgress?: (p: MigrationProgress) => void, options: MigrationOptions = {}): Promise<MigrationResult> {
    // What this phone has from the old app is checked first: it's cheap and decides everything else.
    const [rows, defaults] = await Promise.all([this.deps.readStore(), this.deps.readDefaults()]);
    const userKey = defaults.userRecordName ?? null;
    const data = rows ? parseLegacyStore(rows) : { households: [], recordCount: 0 };
    const hasLegacy = !!userKey && data.households.length > 0;
    const reliable = this.deps.legacyAvailable;
    this.deps.log?.(
      hasLegacy
        ? `Found ${data.households.length} household(s) and ${data.recordCount} records from the old app on this phone (importing into the ${this.deps.environment} account).`
        : reliable
          ? 'No data from the old app was found on this phone.'
          : 'This build cannot read the old app\'s data.',
    );

    const existing = await this.deps.getUserDoc(uid);
    if (!options.force && existing?.migrationState === 'done') {
      // On another phone, the person keeps the identity their migrated data is filed under.
      return { state: 'alreadyDone', reliable: true, userRecordName: existing.legacyUserKey ?? userKey, defaults: {}, households: 0, records: 0 };
    }

    if (!hasLegacy) {
      if (!existing && reliable) {
        await this.deps.setUserDoc(uid, { migrationState: 'none', checkedAt: this.deps.now(), appVersion: this.deps.appVersion });
      }
      return { state: 'none', reliable, userRecordName: existing?.legacyUserKey ?? userKey, defaults, households: 0, records: 0 };
    }

    let done = 0;
    const report = (n: number) => { done += n; onProgress?.({ done, total: data.recordCount }); };
    onProgress?.({ done: 0, total: data.recordCount });

    let moved = 0;
    for (const snapshot of data.households) {
      // Only households this person belongs to can be claimed.
      const counts = `${snapshot.members.length} members, ${snapshot.options.length} custom options, ${snapshot.items.length} items, ${snapshot.purchases.length} purchases, ${snapshot.tripTotals.length} trip totals`;
      if (!snapshot.members.some((m) => m.id === userKey)) { this.deps.log?.(`Skipped a household you are not a member of (${counts}).`); report(1); continue; }
      this.deps.log?.(`Moving a household: ${counts}.`);
      await this.moveHousehold(snapshot, userKey, report);
      moved++;
    }

    await this.deps.setUserDoc(uid, {
      migrationState: 'done', migratedAt: this.deps.now(), appVersion: this.deps.appVersion, legacyUserKey: userKey, households: moved,
      migratedInto: this.deps.environment,
    });
    this.deps.log?.(`Moved ${moved} household(s) to your account.`);
    return { state: 'done', reliable: true, userRecordName: userKey, defaults, households: moved, records: data.recordCount };
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
