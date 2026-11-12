const { withAppBuildGradle } = require('expo/config-plugins');

/** `locales` in app.config also writes the iOS-only Info.plist keys as Android strings; lint would reject them as ExtraTranslation. */
module.exports = (config) =>
  withAppBuildGradle(config, (c) => {
    if (!c.modResults.contents.includes('ExtraTranslation')) {
      c.modResults.contents = c.modResults.contents.replace(/android\s*\{/, "android {\n    lint {\n        disable 'ExtraTranslation'\n    }");
    }
    return c;
  });
