import { getFirestore } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';

export interface Window { start: number; count: number }

// Pure so it can be tested: returns the next window, or null when the limit is reached.
export function advance(state: Window | undefined, now: number, max: number, windowMs: number): Window | null {
  if (!state || now - state.start >= windowMs) return { start: now, count: 1 };
  if (state.count >= max) return null;
  return { start: state.start, count: state.count + 1 };
}

export async function limit(uid: string, action: string, max: number, windowMs: number): Promise<void> {
  const db = getFirestore();
  const ref = db.doc(`rateLimits/${uid}_${action}`);
  const allowed = await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const next = advance(snap.exists ? (snap.data() as Window) : undefined, Date.now(), max, windowMs);
    if (!next) return false;
    tx.set(ref, next);
    return true;
  });
  if (!allowed) throw new HttpsError('resource-exhausted', 'Too many attempts. Please try again later.');
}
