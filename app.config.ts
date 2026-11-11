import type { ExpoConfig } from 'expo/config';

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
    bundleIdentifier: 'com.manniedev-team.shopzyy',
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
  experiments: { typedRoutes: true },
};

export default config;
