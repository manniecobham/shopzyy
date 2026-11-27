import { Platform } from 'react-native';

const IOS_ID = '6823087110';
const ANDROID_PACKAGE = 'com.manniedevteam.shopzyy';

export const STORE_URL = {
  ios: `https://apps.apple.com/app/id${IOS_ID}`,
  android: `https://play.google.com/store/apps/details?id=${ANDROID_PACKAGE}`,
};

export const REVIEW_URL = {
  ios: `https://apps.apple.com/app/id${IOS_ID}?action=write-review`,
  android: `market://details?id=${ANDROID_PACKAGE}`,
};

export const storeUrl = (): string => (Platform.OS === 'ios' ? STORE_URL.ios : STORE_URL.android);
export const reviewUrl = (): string => (Platform.OS === 'ios' ? REVIEW_URL.ios : REVIEW_URL.android);
