import { getFirestore } from 'firebase-admin/firestore';
import { GoogleAuth } from 'google-auth-library';
import { onSchedule } from 'firebase-functions/v2/scheduler';
import { androidVersionFrom, iosVersionFrom, versionPatch } from './storeVersionsLogic';

const IOS_ID = '6823087110';
const ANDROID_PACKAGE = 'com.manniedevteam.shopzyy';

async function iosVersion(): Promise<string | null> {
  for (const country of ['us', 'gb', 'ng']) {
    const res = await fetch(`https://itunes.apple.com/lookup?id=${IOS_ID}&country=${country}`);
    if (!res.ok) continue;
    const version = iosVersionFrom(await res.json());
    if (version) return version;
  }
  return null;
}

// Needs the function's service account invited in Play Console (Users and permissions).
async function androidVersion(): Promise<string | null> {
  const client = await new GoogleAuth({ scopes: ['https://www.googleapis.com/auth/androidpublisher'] }).getClient();
  const base = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${ANDROID_PACKAGE}`;
  const edit = await client.request<{ id: string }>({ url: `${base}/edits`, method: 'POST', data: {} });
  try {
    const track = await client.request({ url: `${base}/edits/${edit.data.id}/tracks/production` });
    return androidVersionFrom(track.data);
  } finally {
    await client.request({ url: `${base}/edits/${edit.data.id}`, method: 'DELETE' }).catch(() => undefined);
  }
}

export const syncStoreVersions = onSchedule({ schedule: 'every 6 hours', timeoutSeconds: 60 }, async () => {
  const [ios, android] = await Promise.all([
    iosVersion().catch((e) => { console.error('App Store lookup failed', e); return null; }),
    androidVersion().catch((e) => { console.warn('Google Play lookup failed (is the service account invited in Play Console?)', e instanceof Error ? e.message : e); return null; }),
  ]);
  const ref = getFirestore().doc('config/app');
  const patch = versionPatch((await ref.get()).data() ?? {}, { ios, android });
  console.log('Store versions', { ios, android, wrote: patch });
  if (Object.keys(patch).length > 0) await ref.set(patch, { merge: true });
});
