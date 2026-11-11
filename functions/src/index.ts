import { initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import { randomInt } from 'node:crypto';

initializeApp();
const db = getFirestore();

// No 0/O/1/I/L: invite codes get read out loud and typed by hand.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 8;
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const requireAuth = (uid: string | undefined): string => {
  if (!uid) throw new HttpsError('unauthenticated', 'Sign in first.');
  return uid;
};

async function memberUIDs(householdID: string): Promise<string[]> {
  const snap = await db.doc(`households/${householdID}`).get();
  if (!snap.exists) throw new HttpsError('not-found', 'This household no longer exists.');
  return (snap.get('memberUIDs') as string[] | undefined) ?? [];
}

const newCode = () => Array.from({ length: CODE_LENGTH }, () => ALPHABET[randomInt(ALPHABET.length)]).join('');

/** A member creates an invite code (shared as a link: shopzyy://join/<code>). */
export const createInvite = onCall(async (req) => {
  const uid = requireAuth(req.auth?.uid);
  const householdID = String(req.data?.householdID ?? '');
  if (!householdID) throw new HttpsError('invalid-argument', 'householdID is required.');
  if (!(await memberUIDs(householdID)).includes(uid)) throw new HttpsError('permission-denied', 'Not a member.');

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = newCode();
    const ref = db.doc(`invites/${code}`);
    try {
      await ref.create({ householdID, createdBy: uid, createdAt: FieldValue.serverTimestamp(), expiresAt: new Date(Date.now() + INVITE_TTL_MS) });
      return { code };
    } catch {
      // Code collision: try another.
    }
  }
  throw new HttpsError('internal', "Couldn't create an invite. Try again.");
});

/** Joins the household behind an invite code. Idempotent for existing members. */
export const joinHousehold = onCall(async (req) => {
  const uid = requireAuth(req.auth?.uid);
  const code = String(req.data?.code ?? '').trim().toUpperCase();
  if (code.length !== CODE_LENGTH) throw new HttpsError('invalid-argument', 'That invite code is not valid.');

  const invite = await db.doc(`invites/${code}`).get();
  if (!invite.exists) throw new HttpsError('not-found', 'That invite code is not valid.');
  const expiresAt = invite.get('expiresAt')?.toDate?.() as Date | undefined;
  if (expiresAt && expiresAt.getTime() < Date.now()) throw new HttpsError('failed-precondition', 'That invite has expired.');

  const householdID = invite.get('householdID') as string;
  const ref = db.doc(`households/${householdID}`);
  const household = await ref.get();
  if (!household.exists) throw new HttpsError('not-found', 'This household no longer exists.');

  await ref.update({ memberUIDs: FieldValue.arrayUnion(uid) });
  return { householdID, name: (household.get('name') as string) ?? '' };
});

/** A member leaves a household someone else owns. */
export const leaveHousehold = onCall(async (req) => {
  const uid = requireAuth(req.auth?.uid);
  const householdID = String(req.data?.householdID ?? '');
  const ref = db.doc(`households/${householdID}`);
  const snap = await ref.get();
  if (!snap.exists) return { ok: true }; // already gone
  if (snap.get('ownerUID') === uid) throw new HttpsError('failed-precondition', 'The owner deletes the household instead of leaving it.');
  await ref.update({ memberUIDs: FieldValue.arrayRemove(uid) });
  return { ok: true };
});

/** The owner deletes a household, and everything in it, for everyone. */
export const deleteHousehold = onCall(async (req) => {
  const uid = requireAuth(req.auth?.uid);
  const householdID = String(req.data?.householdID ?? '');
  const ref = db.doc(`households/${householdID}`);
  const snap = await ref.get();
  if (!snap.exists) return { ok: true };
  if (snap.get('ownerUID') !== uid) throw new HttpsError('permission-denied', 'Only the owner can delete a household.');

  await db.recursiveDelete(ref);
  const invites = await db.collection('invites').where('householdID', '==', householdID).get();
  await Promise.all(invites.docs.map((d) => d.ref.delete()));
  return { ok: true };
});
