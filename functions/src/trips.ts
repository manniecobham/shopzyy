import { getFunctions } from 'firebase-admin/functions';
import { getFirestore, Timestamp, type QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { getMessaging, type Message } from 'firebase-admin/messaging';
import { onDocumentCreated, onDocumentWritten } from 'firebase-functions/v2/firestore';
import { onTaskDispatched } from 'firebase-functions/v2/tasks';
import { MESSAGES, normalizeLang, tripSummary, tripTitle, type Lang } from './messages';
import { TRIP_MAX_GAP_MS, TRIP_QUIET_PERIOD_MS, groupTrips, totalMatchesTrip, tripContaining, type Trip } from './tripLogic';

const db = getFirestore();
const LOOKBACK_MS = 24 * 60 * 60 * 1000;

const ms = (v: unknown): number => (v instanceof Timestamp ? v.toMillis() : typeof v === 'number' ? v : 0);

interface PurchaseDoc { id: string; purchasedAtMs: number; itemID: string | null; originDeviceID: string }
const toPurchase = (d: QueryDocumentSnapshot): PurchaseDoc => ({
  id: d.id, purchasedAtMs: ms(d.get('purchasedAt')), itemID: (d.get('item') as string | null) ?? null, originDeviceID: (d.get('originDeviceID') as string) ?? '',
});

async function buyerPurchases(householdID: string, buyerKey: string, sinceMs: number, untilMs?: number): Promise<PurchaseDoc[]> {
  let q = db.collection(`households/${householdID}/purchases`).where('member', '==', buyerKey).where('purchasedAt', '>=', Timestamp.fromMillis(sinceMs));
  if (untilMs !== undefined) q = q.where('purchasedAt', '<=', Timestamp.fromMillis(untilMs));
  return (await q.get()).docs.map(toPurchase);
}

export const onPurchaseCreated = onDocumentCreated('households/{householdID}/purchases/{purchaseID}', async (event) => {
  const data = event.data?.data();
  if (!data?.member) return; // buyer unknown: nothing meaningful to announce
  await getFunctions().taskQueue('sendTripAlert').enqueue(
    { householdID: event.params.householdID, purchaseID: event.params.purchaseID, purchasedAtMs: ms(data.purchasedAt) },
    { scheduleDelaySeconds: Math.ceil(TRIP_QUIET_PERIOD_MS / 1000) },
  );
});

export const sendTripAlert = onTaskDispatched<{ householdID: string; purchaseID: string; purchasedAtMs: number }>(
  { retryConfig: { maxAttempts: 3, minBackoffSeconds: 30 }, rateLimits: { maxConcurrentDispatches: 10 } },
  async (req) => {
    const { householdID, purchaseID, purchasedAtMs } = req.data;
    const doc = await db.doc(`households/${householdID}/purchases/${purchaseID}`).get();
    if (!doc.exists) return; // undone in the meantime
    const buyerKey = doc.get('member') as string | null;
    if (!buyerKey) return;

    const purchases = await buyerPurchases(householdID, buyerKey, Date.now() - LOOKBACK_MS);
    const trip = tripContaining(groupTrips(householdID, buyerKey, purchases), purchaseID);
    if (!trip) return;
    if (trip.endMs > purchasedAtMs) return; // more items were ticked off; that purchase's task will announce the trip
    await deliver(trip, (doc.get('originDeviceID') as string) ?? '');
  },
);

export const onTripTotalWritten = onDocumentWritten('households/{householdID}/tripTotals/{totalID}', async (event) => {
  const data = event.data?.after.data();
  if (!data) return;
  const buyerKey = data.enteredBy as string | null;
  const endedMs = ms(data.tripEndedAt);
  if (!buyerKey || !endedMs) return;
  const { householdID } = event.params;

  const purchases = await buyerPurchases(householdID, buyerKey, endedMs - TRIP_MAX_GAP_MS - 24 * 3600_000, endedMs + TRIP_MAX_GAP_MS);
  const total = { tripKey: data.tripKey as string, enteredBy: buyerKey, tripEndedAtMs: endedMs };
  const trip = groupTrips(householdID, buyerKey, purchases).find((t) => totalMatchesTrip(total, t));
  if (!trip || Date.now() - trip.endMs > LOOKBACK_MS) return;
  await deliver(trip, purchases.find((p) => p.id === trip.purchases[trip.purchases.length - 1].id)?.originDeviceID ?? '');
});

async function deliver(trip: Trip, originDeviceID: string): Promise<void> {
  const { householdID, buyerKey } = trip;
  const household = await db.doc(`households/${householdID}`).get();
  if (!household.exists) return;
  const memberUIDs = (household.get('memberUIDs') as string[] | undefined) ?? [];
  const householdName = (household.get('name') as string) || '';

  const buyer = await db.doc(`households/${householdID}/members/${buyerKey}`).get();
  const buyerName = (buyer.get('name') as string) || '';

  const itemRefs = [...new Set(trip.purchases.map((p) => p.itemID).filter((x): x is string => !!x))].map((id) => db.doc(`households/${householdID}/items/${id}`));
  const items = itemRefs.length ? await db.getAll(...itemRefs) : [];
  const nameByItem = new Map(items.map((i) => [i.id, (i.get('name') as string) || '']));
  const rawNames = trip.purchases.map((p) => (p.itemID ? nameByItem.get(p.itemID) : undefined) || '').reverse(); // newest first, like Activity

  const totals = await db.collection(`households/${householdID}/tripTotals`).where('enteredBy', '==', buyerKey).get();
  const match = totals.docs.find((t) => totalMatchesTrip({ tripKey: t.get('tripKey') as string, enteredBy: buyerKey, tripEndedAtMs: ms(t.get('tripEndedAt')) }, trip));

  // Text is composed per recipient language (each device stores its own), once per language.
  const composed = new Map<Lang, { title: string; body: string; household: string }>();
  const textFor = (lang: Lang) => {
    let c = composed.get(lang);
    if (!c) {
      const m = MESSAGES[lang];
      const names = rawNames.map((n) => n || m.anItem);
      const totalText = match ? formatMoney(match.get('amount') as number, match.get('currencyCode') as string, lang) : null;
      c = { title: tripTitle(buyerName || m.someone, lang), body: tripSummary(names, 3, totalText, lang), household: householdName || m.sharedHousehold };
      composed.set(lang, c);
    }
    return c;
  };
  const messaging = getMessaging();
  const invalid: string[] = [];

  for (const uid of memberUIDs) {
    const devices = await db.collection(`users/${uid}/devices`).where('alerts', '==', true).get();
    const targets = devices.docs.filter((d) => d.id !== originDeviceID && typeof d.get('token') === 'string');
    if (targets.length === 0) continue;

    // The household name only helps people who are in more than one.
    const count = (await db.collection('households').where('memberUIDs', 'array-contains', uid).count().get()).data().count;
    const messages: Message[] = targets.map((d) => {
      const text = textFor(normalizeLang(d.get('language')));
      return {
      token: d.get('token') as string,
      notification: { title: text.title, body: count > 1 ? `${text.household}: ${text.body}` : text.body },
      data: { kind: 'trip', tripId: trip.id, householdID },
      apns: { headers: { 'apns-collapse-id': trip.id.slice(0, 64) }, payload: { aps: { 'thread-id': 'trips', sound: 'default' } } },
      android: { notification: { tag: trip.id, channelId: 'default' } },
      };
    });
    const result = await messaging.sendEach(messages);
    result.responses.forEach((r, i) => {
      const code = r.error?.code ?? '';
      if (code === 'messaging/registration-token-not-registered' || code === 'messaging/invalid-registration-token') invalid.push(targets[i].ref.path);
    });
  }
  await Promise.all(invalid.map((path) => db.doc(path).delete()));
}

function formatMoney(amount: number, code: string, lang: Lang): string {
  try { return new Intl.NumberFormat(lang, { style: 'currency', currency: code }).format(amount); } catch { return `${amount.toFixed(2)} ${code}`; }
}

