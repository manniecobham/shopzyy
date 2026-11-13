import { existsSync, readFileSync } from 'node:fs';
import type { ExpoConfig } from 'expo/config';

const APP_ENV = process.env.APP_ENV === 'production' ? 'production' : 'development';
const LINK_HOST = APP_ENV === 'production' ? 'shopzyy.manniedev.com' : 'shopzyy-8e62c.web.app';
const LINK_HOSTS = APP_ENV === 'production' ? ['shopzyy.manniedev.com', 'shopzyy-19bc2.web.app'] : ['shopzyy-8e62c.web.app'];
const FIREBASE_DIR = `./firebase/${APP_ENV}`;

if (APP_ENV === 'production' && process.env.EXPO_PUBLIC_DEMO === '1') {
  throw new Error('EXPO_PUBLIC_DEMO=1 is not allowed for production builds (APP_ENV=production).');
}
const IOS_FIREBASE_FILE = process.env.GOOGLE_SERVICES_PLIST ?? `${FIREBASE_DIR}/GoogleService-Info.plist`;
const ANDROID_FIREBASE_FILE = process.env.GOOGLE_SERVICES_JSON ?? `${FIREBASE_DIR}/google-services.json`;

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
  locales: { es: './locales/es.json', fr: './locales/fr.json', nl: './locales/nl.json', de: './locales/de.json', it: './locales/it.json' },
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.manniedev-team.shopzy',
    googleServicesFile: IOS_FIREBASE_FILE,
    infoPlist: {
      UIBackgroundModes: ['remote-notification'],
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
    blockedPermissions: ['android.permission.ACTIVITY_RECOGNITION', 'android.permission.health.READ_STEPS'],
    intentFilters: [{
      action: 'VIEW',
      autoVerify: true,
      data: LINK_HOSTS.map((host) => ({ scheme: 'https', host, pathPrefix: '/join' })),
      category: ['BROWSABLE', 'DEFAULT'],
    }],
  },
  plugins: [
    './plugins/withNotificationColorMerge',
    // Android: the iOS-only strings from `locales` above would fail the release lint check.
    './plugins/withAndroidLintTweaks',
    'expo-router',
    '@react-native-firebase/app',
    '@react-native-firebase/auth',
    '@react-native-google-signin/google-signin',
    ['expo-build-properties', { ios: { useFrameworks: 'dynamic' }, android: { kotlinVersion: '2.4.0' } }],
    // Android status-bar icon: white silhouette of the basket, in the brand green.
    ['expo-notifications', { icon: './assets/notification-icon.png', color: '#1E9E68' }],
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
