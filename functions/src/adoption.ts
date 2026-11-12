import { FieldValue, Timestamp, getFirestore } from 'firebase-admin/firestore';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { adoptionDelta, nest, readiness, type UserDoc } from './adoptionLogic';

const db = getFirestore();

export const onUserWritten = onDocumentWritten('users/{uid}', async (event) => {
  const delta = adoptionDelta(event.data?.before.data() as UserDoc | undefined, event.data?.after.data() as UserDoc | undefined);
  if (Object.keys(delta).length === 0) return;
  await db.doc('stats/adoption').set({ ...nest(delta, (n) => FieldValue.increment(n)), updatedAt: FieldValue.serverTimestamp() }, { merge: true });
});

export const updateAdoptionReport = onSchedule('every day 06:00', async () => {
  const now = Date.now();
  const users = db.collection('users');
  const [done, week, first, config] = await Promise.all([
    users.where('migrationState', '==', 'done').count().get(),
    users.where('migrationState', '==', 'done').where('migratedAt', '>=', Timestamp.fromMillis(now - 7 * 86_400_000)).count().get(),
    users.where('migrationState', '==', 'done').orderBy('migratedAt', 'asc').limit(1).get(),
    db.doc('config/app').get(),
  ]);
  const estimate = (config.get('legacyUserEstimate') as number | undefined) ?? null;
  const report = readiness({
    migrated: done.data().count,
    estimate,
    firstMigratedAtMs: (first.docs[0]?.get('migratedAt') as Timestamp | undefined)?.toMillis() ?? null,
    migratedLast7d: week.data().count,
    nowMs: now,
  });
  await db.doc('stats/adoption').set({ report: { ...report, migrated: done.data().count, estimate, migratedLast7d: week.data().count, computedAt: FieldValue.serverTimestamp() } }, { merge: true });
  console.log('Migration adoption', JSON.stringify({ ...report, migrated: done.data().count, estimate }));
});
