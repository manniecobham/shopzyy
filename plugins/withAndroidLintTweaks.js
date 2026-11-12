const { withAppBuildGradle } = require('expo/config-plugins');

module.exports = (config) =>
  withAppBuildGradle(config, (c) => {
    if (!c.modResults.contents.includes('ExtraTranslation')) {
      c.modResults.contents = c.modResults.contents.replace(/android\s*\{/, "android {\n    lint {\n        disable 'ExtraTranslation'\n    }");
    }
    return c;
  });
