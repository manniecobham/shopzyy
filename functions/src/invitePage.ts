import { getFirestore } from 'firebase-admin/firestore';
import { onRequest } from 'firebase-functions/v2/https';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { normalizeLang } from './messages';
import { invitePreview, renderInvitePage } from './invitePreview';

const HOSTS = new Set(['shopzyy.manniedev.com', 'shopzyy-19bc2.web.app', 'shopzyy-19bc2.firebaseapp.com', 'shopzyy-8e62c.web.app', 'shopzyy-8e62c.firebaseapp.com']);
const DEFAULT_HOST = 'shopzyy.manniedev.com';
const CODE_RE = /^[A-HJKMNP-Z2-9]{8}$/;

const template = readFileSync(join(__dirname, 'join.html'), 'utf8');

async function lookup(code: string): Promise<{ household: string; inviter: string } | null> {
  const db = getFirestore();
  const invite = await db.doc(`invites/${code}`).get();
  if (!invite.exists) return null;
  const expiresAt = invite.get('expiresAt')?.toDate?.() as Date | undefined;
  if (expiresAt && expiresAt.getTime() < Date.now()) return null;

  const householdID = invite.get('householdID') as string;
  const createdBy = invite.get('createdBy') as string | undefined;
  const [household, member] = await Promise.all([
    db.doc(`households/${householdID}`).get(),
    createdBy ? db.doc(`households/${householdID}/members/${createdBy}`).get() : Promise.resolve(null),
  ]);
  if (!household.exists) return null;
  return { household: (household.get('name') as string) ?? '', inviter: (member?.get('name') as string | undefined) ?? '' };
}

export const invitePage = onRequest({ memory: '256MiB', timeoutSeconds: 10 }, async (req, res) => {
  const code = (req.path.split('/')[2] ?? '').toUpperCase();
  const lang = normalizeLang(String(req.headers['accept-language'] ?? '').split(',')[0]);

  let details: { household: string; inviter: string } | null = null;
  if (CODE_RE.test(code)) {
    try { details = await lookup(code); } catch { details = null; }
  }
  const forwarded = String(req.headers['x-forwarded-host'] ?? req.hostname ?? '').split(',')[0].trim().toLowerCase();
  const HOST = `https://${HOSTS.has(forwarded) ? forwarded : DEFAULT_HOST}`;
  const preview = invitePreview(lang, details?.household, details?.inviter);
  const url = CODE_RE.test(code) ? `${HOST}/join/${code}` : `${HOST}/join`;

  res.set('Cache-Control', 'public, max-age=300, s-maxage=300');
  res.set('Vary', 'Accept-Language');
  res.status(200).type('html').send(renderInvitePage(template, preview, url, `${HOST}/og-image.png`));
});
