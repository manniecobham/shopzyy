import * as StoreReview from 'expo-store-review';
import { Linking } from 'react-native';
import { reviewUrl, storeUrl } from '../lib/storeLinks';

// The system sheet is limited by the store and may show nothing, so it is only used for the automatic ask.
export async function askForReview(): Promise<void> {
  try {
    if (await StoreReview.isAvailableAsync()) await StoreReview.requestReview();
  } catch {
    // Not available on this device.
  }
}

export async function openReviewPage(): Promise<void> {
  try {
    await Linking.openURL(reviewUrl());
  } catch {
    await Linking.openURL(storeUrl()).catch(() => undefined);
  }
}
