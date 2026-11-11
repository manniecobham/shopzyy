// expo-notifications and Firebase Messaging both set `com.google.firebase.messaging.default_notification_color`
// in the Android manifest, and the manifest merger refuses to pick one. This makes ours (the brand green) win.
// Listed first in `plugins`: mods run last-registered-first, so this one sees the entries expo-notifications adds.
const { withAndroidManifest } = require('expo/config-plugins');

module.exports = function withNotificationColorMerge(config) {
  return withAndroidManifest(config, (c) => {
    const manifest = c.modResults.manifest;
    manifest.$ = { ...manifest.$, 'xmlns:tools': 'http://schemas.android.com/tools' };
    for (const meta of manifest.application?.[0]?.['meta-data'] ?? []) {
      if (meta.$['android:name'] === 'com.google.firebase.messaging.default_notification_color') {
        meta.$['tools:replace'] = 'android:resource';
      }
    }
    return c;
  });
};
