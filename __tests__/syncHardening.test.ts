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
