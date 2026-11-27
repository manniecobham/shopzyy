const VERSION = /\d+\.\d+(?:\.\d+)?/g;

export function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map((n) => parseInt(n, 10) || 0);
  const pb = b.split('.').map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d < 0 ? -1 : 1;
  }
  return 0;
}

const highest = (versions: string[]): string | null => versions.reduce<string | null>((best, v) => (!best || compareVersions(v, best) > 0 ? v : best), null);

// Apple's lookup lists the version everyone can download.
export function iosVersionFrom(json: unknown): string | null {
  const results = (json as { results?: { version?: unknown }[] } | null)?.results;
  const version = results?.[0]?.version;
  return typeof version === 'string' && /^\d+\.\d+(\.\d+)?$/.test(version) ? version : null;
}

// Only fully rolled-out releases count: a staged rollout is not available to everyone yet.
export function androidVersionFrom(track: unknown): string | null {
  const releases = (track as { releases?: { name?: unknown; status?: unknown }[] } | null)?.releases ?? [];
  return highest(releases
    .filter((r) => r.status === 'completed' && typeof r.name === 'string')
    .flatMap((r) => (r.name as string).match(VERSION)?.slice(-1) ?? []));
}

// Never goes backwards, so a stale answer from a store cannot hide a banner that is already showing.
export function versionPatch(current: { latestVersionIos?: string; latestVersionAndroid?: string }, found: { ios: string | null; android: string | null }) {
  const patch: { latestVersionIos?: string; latestVersionAndroid?: string } = {};
  if (found.ios && (!current.latestVersionIos || compareVersions(found.ios, current.latestVersionIos) > 0)) patch.latestVersionIos = found.ios;
  if (found.android && (!current.latestVersionAndroid || compareVersions(found.android, current.latestVersionAndroid) > 0)) patch.latestVersionAndroid = found.android;
  return patch;
}
