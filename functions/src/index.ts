import { initializeApp } from 'firebase-admin/app';
import { FieldValue, Timestamp, getFirestore } from 'firebase-admin/firestore';
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

// MARK: Migration from the original iOS app (CloudKit → Firebase)

const LEGACY_WINDOW_MS = 180 * 24 * 60 * 60 * 1000;
const UUID_RE = /^[0-9A-F]{8}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{12}$/;

type Wire = unknown;
type DocEntry = { id: string; data: Record<string, Wire> };

function revive(value: Wire): Wire {
  if (Array.isArray(value)) return value.map(revive);
  if (value && typeof value === 'object') {
    const obj = value as Record<string, Wire>;
    if (typeof obj.__date === 'number' && Object.keys(obj).length === 1) return Timestamp.fromMillis(obj.__date);
    return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, revive(v)]));
  }
  return value;
}

const validEntries = (v: Wire, max: number): DocEntry[] => {
  if (!Array.isArray(v) || v.length > max) throw new HttpsError('invalid-argument', 'Bad records.');
  return v.map((e) => {
    const entry = e as DocEntry;
    if (typeof entry?.id !== 'string' || !entry.id || entry.id.includes('/') || typeof entry.data !== 'object' || entry.data === null) {
      throw new HttpsError('invalid-argument', 'Bad record.');
    }
    return entry;
  });
};

async function createMissing(parent: string, entries: DocEntry[]): Promise<number> {
  let created = 0;
  for (let i = 0; i < entries.length; i += 400) {
    const chunk = entries.slice(i, i + 400);
    const refs = chunk.map((e) => db.doc(`${parent}/${e.id}`));
    const existing = await db.getAll(...refs);
    const batch = db.batch();
    chunk.forEach((e, j) => {
      if (existing[j].exists) return;
      batch.set(refs[j], revive(e.data) as Record<string, unknown>);
      created++;
    });
    await batch.commit();
  }
  return created;
}

export const claimLegacyHousehold = onCall({ memory: '512MiB', timeoutSeconds: 120 }, async (req) => {
  const uid = requireAuth(req.auth?.uid);
  const householdID = String(req.data?.householdID ?? '').toUpperCase();
  const userKey = String(req.data?.userRecordName ?? '');
  if (!UUID_RE.test(householdID) || !userKey || userKey.includes('/')) throw new HttpsError('invalid-argument', 'Bad request.');

  // One Firebase account per old identity.
  const claimRef = db.doc(`legacyUsers/${userKey}`);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(claimRef);
    if (snap.exists && snap.get('uid') !== uid) {
      throw new HttpsError('already-exists', 'Your lists were already moved using a different sign-in method. Sign in the way you did the first time.');
    }
    if (!snap.exists) tx.set(claimRef, { uid, claimedAt: FieldValue.serverTimestamp() });
  });

  const ref = db.doc(`households/${householdID}`);
  const snap = await ref.get();

  if (!snap.exists) {
    const members = validEntries(req.data?.members, 200);
    const options = validEntries(req.data?.options, 2000);
    const household = req.data?.household as Record<string, Wire> | undefined;
    if (!household || typeof household !== 'object') throw new HttpsError('invalid-argument', 'Missing household.');
    if (!members.some((m) => m.id === userKey)) throw new HttpsError('permission-denied', 'You are not a member of this household.');

    const isOwner = household.ownerRecordName === userKey;
    await ref.create({
      ...(revive(household) as Record<string, unknown>),
      ownerUID: isOwner ? uid : null,
      memberUIDs: [uid],
      legacy: true,
      legacyMembers: members.map((m) => m.id),
      legacyUntil: Timestamp.fromMillis(Date.now() + LEGACY_WINDOW_MS),
    });
    await createMissing(`households/${householdID}/members`, members);
    await createMissing(`households/${householdID}/options`, options);
    if (typeof req.data?.banner === 'string' && req.data.banner.length < 900_000) {
      await db.doc(`households/${householdID}/assets/banner`).set({ data: req.data.banner });
    }
    return { created: true };
  }

  // Already imported by another member (or by the owner): join it.
  const legacy = snap.get('legacy') === true;
  const until = (snap.get('legacyUntil') as Timestamp | undefined)?.toMillis() ?? 0;
  const knownMembers = (snap.get('legacyMembers') as string[] | undefined) ?? [];
  if (!legacy || until < Date.now() || !knownMembers.includes(userKey)) throw new HttpsError('permission-denied', 'This household can no longer be claimed.');

  const update: Record<string, unknown> = { memberUIDs: FieldValue.arrayUnion(uid) };
  if (!snap.get('ownerUID') && snap.get('ownerRecordName') === userKey) update.ownerUID = uid;
  await ref.update(update);
  return { created: false };
});

export const importLegacyRecords = onCall({ memory: '512MiB', timeoutSeconds: 120 }, async (req) => {
  const uid = requireAuth(req.auth?.uid);
  const householdID = String(req.data?.householdID ?? '').toUpperCase();
  const kind = String(req.data?.kind ?? '');
  if (!UUID_RE.test(householdID) || !['items', 'purchases', 'tripTotals'].includes(kind)) throw new HttpsError('invalid-argument', 'Bad request.');

  const snap = await db.doc(`households/${householdID}`).get();
  if (!snap.exists || snap.get('legacy') !== true) throw new HttpsError('failed-precondition', 'Nothing to import into.');
  if (!((snap.get('memberUIDs') as string[] | undefined) ?? []).includes(uid)) throw new HttpsError('permission-denied', 'Not a member.');
  if (((snap.get('legacyUntil') as Timestamp | undefined)?.toMillis() ?? 0) < Date.now()) throw new HttpsError('failed-precondition', 'The migration window has closed.');

  const created = await createMissing(`households/${householdID}/${kind}`, validEntries(req.data?.docs, 500));
  return { created };
});

export * from './trips';
export * from './adoption';
export * from './invitePage';
