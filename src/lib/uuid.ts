/**
 * RFC 4122 v4 id, UPPERCASE to match Swift's `UUID().uuidString`. Ids appear inside
 * synced keys (trip ids, section keys such as "category:custom:<UUID>"), so the casing
 * must be identical on both platforms.
 */
export function uuid(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto;
  const raw = c?.randomUUID
    ? c.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
        const r = (Math.random() * 16) | 0;
        return (ch === 'x' ? r : (r & 0x3) | 0x8).toString(16);
      });
  return raw.toUpperCase();
}

/** Normalises any UUID string to the canonical uppercase form. */
export const normalizeUUID = (id: string): string => id.toUpperCase();
