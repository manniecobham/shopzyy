import { Stack } from 'expo-router';
import { useHeaderHeight } from 'expo-router/react-navigation';
import type { ReactNode } from 'react';
import { Platform } from 'react-native';

/** True on iOS 26+, where the system draws headers and the tab bar with Liquid Glass. */
export const isIOS26 = Platform.OS === 'ios' && parseInt(String(Platform.Version), 10) >= 26;

/**
 * The iOS header floats over the content (translucent, glass on iOS 26), like a SwiftUI navigation bar
 * over a List. Content therefore starts below it by this much; on Android the header is opaque and
 * the screen already starts under it.
 */
export function useHeaderInset(): number {
  const height = useHeaderHeight();
  return Platform.OS === 'ios' ? height : 0;
}

/**
 * Configures the native navigation bar for the screen it's rendered in: an inline centred title with
 * the household switcher on the left and actions on the right (SwiftUI's `.navigationTitle` +
 * `.toolbar`). The bar is the real system one, so it looks and behaves like iOS.
 */
export function ScreenOptions({ title, left, right }: { title: string; left?: ReactNode; right?: ReactNode }) {
  return (
    <Stack.Screen
      options={{
        title,
        headerTitleAlign: 'center',
        headerTransparent: { ios: true, android: false },
        // Liquid Glass replaces blur on iOS 26; older iOS gets the standard translucent material.
        headerBlurEffect: Platform.OS === 'ios' && !isIOS26 ? 'systemChromeMaterial' : undefined,
        headerShadowVisible: false,
        headerLeft: left ? () => left : undefined,
        headerRight: right ? () => right : undefined,
      }}
    />
  );
}
