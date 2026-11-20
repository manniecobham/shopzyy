import { withRetry, isTransient } from '../src/data/sync/retry';
import { advance } from '../functions/src/rateLimit';
import { extractInviteCode } from '../src/lib/inviteCode';
import { plainQuantity } from '../src/models/enums';

const err = (code: string) => Object.assign(new Error(code), { code });
const noWait = { sleep: async () => {} };

describe('withRetry', () => {
  it('retries transient failures and then succeeds', async () => {
    let calls = 0;
    const result = await withRetry(async () => { if (++calls < 3) throw err('firestore/unavailable'); return 'ok'; }, noWait);
    expect(result).toBe('ok');
    expect(calls).toBe(3);
  });
  it('gives up after the attempt limit', async () => {
    let calls = 0;
    await expect(withRetry(async () => { calls++; throw err('unavailable'); }, { ...noWait, attempts: 3 })).rejects.toThrow();
    expect(calls).toBe(3);
  });
  it('does not retry a refusal from the server', async () => {
    let calls = 0;
    await expect(withRetry(async () => { calls++; throw err('firestore/permission-denied'); }, noWait)).rejects.toThrow();
    expect(calls).toBe(1);
    expect(isTransient(err('functions/resource-exhausted'))).toBe(true);
  });
  it('backs off exponentially', async () => {
    const waits: number[] = [];
    await withRetry(async () => { if (waits.length < 2) throw err('unavailable'); }, { baseMs: 100, sleep: async (ms) => { waits.push(ms); } });
    expect(waits).toEqual([100, 200]);
  });
});

describe('rate limit window', () => {
  it('counts up to the limit, then refuses, then resets', () => {
    let w = advance(undefined, 0, 2, 1000)!;
    w = advance(w, 10, 2, 1000)!;
    expect(w.count).toBe(2);
    expect(advance(w, 20, 2, 1000)).toBeNull();
    expect(advance(w, 1001, 2, 1000)).toEqual({ start: 1001, count: 1 });
  });
});

describe('extractInviteCode', () => {
  it('finds a code in a link, in plain text and in lowercase', () => {
    expect(extractInviteCode('https://shopzyy.manniedev.com/join/ABCD2345')).toBe('ABCD2345');
    expect(extractInviteCode('my code: abcd2345!')).toBe('ABCD2345');
  });
  it('ignores text without a code', () => {
    expect(extractInviteCode('milk and eggs')).toBeNull();
    expect(extractInviteCode('ABCD0OIL')).toBeNull();
    expect(extractInviteCode(null)).toBeNull();
  });
});

describe('plainQuantity', () => {
  it('keeps small numbers plain and groups thousands', () => {
    expect(plainQuantity(3)).toBe('3');
    expect(plainQuantity(2.5)).toBe('2.5');
    expect(plainQuantity(1500)).toMatch(/^1[,.   ]?500$/);
  });
});

import { inviteLink } from '../src/lib/inviteCode';
import { qrRuns } from '../src/lib/qr';

describe('invite QR code', () => {
  const link = inviteLink('shopzyy.manniedev.com', 'ABCD2345');

  it('builds the invite link that the system camera opens in the app', () => {
    expect(link).toBe('https://shopzyy.manniedev.com/join/ABCD2345');
    expect(extractInviteCode(link)).toBe('ABCD2345');
  });

  it('produces a valid square with the finder pattern in the corner', () => {
    const { size, rows } = qrRuns(link);
    expect((size - 17) % 4).toBe(0);
    expect(rows).toHaveLength(size);
    expect(rows[0][0]).toEqual({ start: 0, length: 7 });
    expect(rows[0][rows[0].length - 1]).toEqual({ start: size - 7, length: 7 });
    expect(rows.flat().every((r) => r.start >= 0 && r.start + r.length <= size)).toBe(true);
  });

  it('uses the highest error correction so a logo can cover the middle', () => {
    // High correction needs a larger grid than the default for the same text.
    const { size } = qrRuns(link);
    expect(size).toBeGreaterThanOrEqual(29);
  });

  it('makes a different pattern for a different code', () => {
    expect(JSON.stringify(qrRuns(link).rows)).not.toBe(JSON.stringify(qrRuns(inviteLink('shopzyy.manniedev.com', 'WXYZ9876')).rows));
  });
});
