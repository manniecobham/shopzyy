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
