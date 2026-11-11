import { existsSync, readFileSync } from 'node:fs';
import type { ExpoConfig } from 'expo/config';

/** The web OAuth client id from google-services.json (client_type 3), needed for Google sign-in. */
function googleWebClientId(): string {
  try {
    if (!existsSync('./google-services.json')) return '';
    const json = JSON.parse(readFileSync('./google-services.json', 'utf8'));
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
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  ios: {
    supportsTablet: false,
    bundleIdentifier: 'com.manniedev-team.shopzy',
    googleServicesFile: './GoogleService-Info.plist',
    infoPlist: { UIBackgroundModes: ['remote-notification'] },
    entitlements: { 'com.apple.developer.applesignin': ['Default'] },
  },
  android: {
    package: 'com.manniedevteam.shopzyy',
    googleServicesFile: './google-services.json',
    adaptiveIcon: {
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  plugins: [
    'expo-router',
    '@react-native-firebase/app',
    '@react-native-firebase/auth',
    '@react-native-google-signin/google-signin',
    ['expo-build-properties', { ios: { useFrameworks: 'dynamic' } }],
    'expo-notifications',
    'expo-localization',
  ],
  extra: { googleWebClientId: googleWebClientId() },
  experiments: { typedRoutes: true },
};

export default config;
