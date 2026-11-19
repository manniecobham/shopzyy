const { withAndroidManifest } = require('expo/config-plugins');

// Locking to portrait makes Android assume a portrait screen is required; mark it optional so every device can install.
module.exports = (config) =>
  withAndroidManifest(config, (c) => {
    const manifest = c.modResults.manifest;
    const features = manifest['uses-feature'] ?? [];
    if (!features.some((f) => f.$['android:name'] === 'android.hardware.screen.portrait')) {
      features.push({ $: { 'android:name': 'android.hardware.screen.portrait', 'android:required': 'false' } });
    }
    manifest['uses-feature'] = features;
    return c;
  });
