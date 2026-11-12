import { existsSync, readFileSync } from 'node:fs';
import type { ExpoConfig } from 'expo/config';

/**
 * Which Firebase project this build talks to. `development` (the default) is for testing,
 * `production` is the real one. Each has its own folder of Firebase files under ./firebase/:
 *   firebase/development/{GoogleService-Info.plist,google-services.json}
 *   firebase/production/{GoogleService-Info.plist,google-services.json}
 * Pick one with APP_ENV, e.g. `APP_ENV=production npx expo prebuild --clean`.
 */
const APP_ENV = process.env.APP_ENV === 'production' ? 'production' : 'development';
/** Where invite links live: Firebase Hosting on each project's default domain. */
const LINK_HOST = APP_ENV === 'production' ? 'shopzyy.manniedev.com' : 'shopzyy-8e62c.web.app';
/** Every domain that serves the link files; builds already out in the world use the first Firebase address, so it stays verified too. */
const LINK_HOSTS = APP_ENV === 'production' ? ['shopzyy.manniedev.com', 'shopzyy-19bc2.web.app'] : ['shopzyy-8e62c.web.app'];
const FIREBASE_DIR = `./firebase/${APP_ENV}`;

// Demo mode (sample data, no sign-in) is for development only. Refuse to build a production app with it.
if (APP_ENV === 'production' && process.env.EXPO_PUBLIC_DEMO === '1') {
  throw new Error('EXPO_PUBLIC_DEMO=1 is not allowed for production builds (APP_ENV=production).');
}
/**
 * The Firebase files are gitignored, so cloud (EAS) builds get them from EAS file variables instead:
 * GOOGLE_SERVICES_PLIST (iOS) and GOOGLE_SERVICES_JSON (Android) hold the path of the uploaded file.
 * Local builds fall back to the files in ./firebase/<env>/.
 */
const IOS_FIREBASE_FILE = process.env.GOOGLE_SERVICES_PLIST ?? `${FIREBASE_DIR}/GoogleService-Info.plist`;
const ANDROID_FIREBASE_FILE = process.env.GOOGLE_SERVICES_JSON ?? `${FIREBASE_DIR}/google-services.json`;

/** The web OAuth client id from google-services.json (client_type 3), needed for Google sign-in. */
function googleWebClientId(): string {
  try {
    if (!existsSync(ANDROID_FIREBASE_FILE)) return '';
    const json = JSON.parse(readFileSync(ANDROID_FIREBASE_FILE, 'utf8'));
    for (const c of json.client ?? []) {
      const web = (c.oauth_client ?? []).find((o: { client_type: number }) => o.client_type === 3);
      if (web) return web.client_id as string;
    }
  } catch {
    // fall through
  }
  return '';
}

const config: ExpoConfig = {
  name: 'Shopzyy',
  slug: 'shopzyy',
  scheme: 'shopzyy',
  version: '1.1.0',
  orientation: 'portrait',
  // Localised app name and permission prompts (iOS Info.plist strings; Android ignores them, see withAndroidLintTweaks).
  locales: { es: './locales/es.json', fr: './locales/fr.json', nl: './locales/nl.json', de: './locales/de.json', it: './locales/it.json' },
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.manniedev-team.shopzy',
    googleServicesFile: IOS_FIREBASE_FILE,
    infoPlist: {
      UIBackgroundModes: ['remote-notification'],
      // Only the encryption built into iOS and standard HTTPS: exempt, so no export-compliance paperwork per build.
      ITSAppUsesNonExemptEncryption: false,
    },
    config: {
      usesNonExemptEncryption: false
    },
    entitlements: { 'com.apple.developer.applesignin': ['Default'] },
    associatedDomains: LINK_HOSTS.map((h) => `applinks:${h}`),
  },
  android: {
    package: 'com.manniedevteam.shopzyy',
    googleServicesFile: ANDROID_FIREBASE_FILE,
    adaptiveIcon: {
      backgroundColor: '#1D9D67',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
    intentFilters: [{
      action: 'VIEW',
      autoVerify: true,
      data: LINK_HOSTS.map((host) => ({ scheme: 'https', host, pathPrefix: '/join' })),
      category: ['BROWSABLE', 'DEFAULT'],
    }],
  },
  plugins: [
    // Android: resolves the notification-colour clash between expo-notifications and Firebase Messaging. Keep it first.
    './plugins/withNotificationColorMerge',
    // Android: the iOS-only strings from `locales` above would fail the release lint check.
    './plugins/withAndroidLintTweaks',
    'expo-router',
    '@react-native-firebase/app',
    '@react-native-firebase/auth',
    '@react-native-google-signin/google-signin',
    // iOS: react-native-firebase needs dynamic frameworks.
    // Android: Firebase Auth 25 (Firebase BoM 35) is compiled with Kotlin 2.4, but RN 0.88 defaults to 2.2.
    ['expo-build-properties', { ios: { useFrameworks: 'dynamic' }, android: { kotlinVersion: '2.4.0' } }],
    // Android status-bar icon: white silhouette of the basket, in the brand green.
    ['expo-notifications', { icon: './assets/notification-icon.png', color: '#1E9E68' }],
    // Same as the Swift app's launch screen: solid brand green (the in-app splash with the cart follows it).
    ['expo-splash-screen', { backgroundColor: '#1E9E68', dark: { backgroundColor: '#1E9E68' } }],
    ['expo-localization', { supportedLocales: { ios: ['en', 'es', 'fr', 'nl', 'de', 'it'], android: ['en', 'es', 'fr', 'nl', 'de', 'it'] } }],
  ],
  extra: {
    googleWebClientId: googleWebClientId(),
    appEnv: APP_ENV,
    linkHost: LINK_HOST,
    eas: { projectId: '36b49906-3fda-47f9-9edd-6d9417b05f17' },
  },
  experiments: { typedRoutes: true },
};

export default config;
