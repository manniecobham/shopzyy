import * as WebBrowser from 'expo-web-browser';
import { Linking } from 'react-native';
import { Brand } from '../theme/theme';

// Opens a page inside the app (a sheet on iPhone, a Custom Tab on Android). Falls back to the phone's browser.
export async function openLegal(url: string): Promise<void> {
  try {
    await WebBrowser.openBrowserAsync(url, {
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
      controlsColor: Brand.launchColor,
      showTitle: true,
      enableBarCollapsing: true,
    });
  } catch {
    await Linking.openURL(url);
  }
}
