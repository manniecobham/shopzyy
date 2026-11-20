import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging, type Message } from 'firebase-admin/messaging';
import { joinedAlert, normalizeLang } from './messages';

export interface JoinNotice { householdID: string; ownerUID: string; joinerName: string; householdName: string; memberCount: number }

// Tells the household owner that someone joined. Only devices that have turned member alerts on get it.
export async function notifyOwnerOfJoin(notice: JoinNotice): Promise<void> {
  const db = getFirestore();
  const devices = await db.collection(`users/${notice.ownerUID}/devices`).where('memberAlerts', '==', true).get();
  const targets = devices.docs.filter((d) => typeof d.get('token') === 'string');
  if (targets.length === 0) return;

  const messages: Message[] = targets.map((d) => {
    const text = joinedAlert(notice.joinerName, notice.householdName, notice.memberCount, normalizeLang(d.get('language')));
    return {
      token: d.get('token') as string,
      notification: { title: text.title, body: text.body },
      data: { kind: 'member', householdID: notice.householdID },
      apns: { payload: { aps: { 'thread-id': 'members', sound: 'default' } } },
      android: { notification: { channelId: 'default' } },
    };
  });
  const result = await getMessaging().sendEach(messages);
  const dead: string[] = [];
  result.responses.forEach((r, i) => {
    const code = r.error?.code ?? '';
    if (code === 'messaging/registration-token-not-registered' || code === 'messaging/invalid-registration-token') dead.push(targets[i].ref.path);
  });
  await Promise.all(dead.map((path) => db.doc(path).delete()));
}
