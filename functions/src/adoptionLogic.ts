// Pure maths for adoption tracking (dependency-free so the app's Jest suite tests it).

export interface UserDoc { migrationState?: string; appVersion?: string; platform?: string }

const safe = (s: string | undefined) => (s ?? 'unknown').replace(/[^A-Za-z0-9_]/g, '_');

function keysOf(u: UserDoc | undefined): string[] {
  if (!u) return [];
  return ['users', `state.${safe(u.migrationState)}`, `version.${safe(u.appVersion)}`, `platform.${safe(u.platform)}`];
}

export function adoptionDelta(before: UserDoc | undefined, after: UserDoc | undefined): Record<string, number> {
  const delta: Record<string, number> = {};
  for (const k of keysOf(after)) delta[k] = (delta[k] ?? 0) + 1;
  for (const k of keysOf(before)) delta[k] = (delta[k] ?? 0) - 1;
  for (const k of Object.keys(delta)) if (delta[k] === 0) delete delta[k];
  return delta;
}

export function nest(flat: Record<string, number>, wrap: (n: number) => unknown): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [dotted, n] of Object.entries(flat)) {
    const parts = dotted.split('.');
    let node = out;
    parts.slice(0, -1).forEach((p) => { node = (node[p] ??= {}) as Record<string, unknown>; });
    node[parts[parts.length - 1]] = wrap(n);
  }
  return out;
}

export interface ReadinessInput {
  migrated: number;
  estimate: number | null;
  firstMigratedAtMs: number | null;
  migratedLast7d: number;
  nowMs: number;
}

export interface Readiness {
  percent: number | null;
  daysSinceFirst: number | null;
  ready: boolean;
  reasons: string[];
}

export const READY_PERCENT = 99;
export const READY_DAYS = 90;

export function readiness(i: ReadinessInput): Readiness {
  const percent = i.estimate && i.estimate > 0 ? Math.min(100, Math.round((i.migrated / i.estimate) * 1000) / 10) : null;
  const daysSinceFirst = i.firstMigratedAtMs === null ? null : Math.floor((i.nowMs - i.firstMigratedAtMs) / 86_400_000);
  const reasons: string[] = [];
  if (percent === null) reasons.push('Set legacyUserEstimate in config/app to compare against the old app\'s user count.');
  else if (percent < READY_PERCENT) reasons.push(`Only ${percent}% moved (need ${READY_PERCENT}%).`);
  if (daysSinceFirst === null) reasons.push('Nobody has migrated yet.');
  else if (daysSinceFirst < READY_DAYS) reasons.push(`Only ${daysSinceFirst} days since the first migration (need ${READY_DAYS}).`);
  const quiet = i.migratedLast7d <= Math.max(1, Math.floor(i.migrated * 0.01));
  if (!quiet) reasons.push(`${i.migratedLast7d} people migrated in the last 7 days; wait until it dries up.`);
  return { percent, daysSinceFirst, ready: reasons.length === 0, reasons };
}
