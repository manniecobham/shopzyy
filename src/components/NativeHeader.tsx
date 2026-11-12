import { Stack } from 'expo-router';
import { useHeaderHeight } from 'expo-router/react-navigation';
import type { ReactNode } from 'react';
import { Platform, View } from 'react-native';
import { useState } from 'react';
import { ActionMenu, type MenuItem } from './Sheet';
import { Glyph, type SymbolName } from './Glyph';
import { useTheme } from '../theme/theme';

import { isIOS26 } from '../theme/theme';
export { isIOS26 };

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
export function ScreenOptions({ title, left, right, menu, largeTitle }: {
  title: string; left?: ReactNode; right?: ReactNode; menu?: HeaderMenu; largeTitle?: boolean;
}) {
  const options = {
    title,
    headerTitleAlign: 'center' as const,
    // SwiftUI's default navigation title is large and collapses as you scroll; the List tab is the one inline exception.
    headerLargeTitle: largeTitle === true,
    headerLargeTitleShadowVisible: false,
    headerTransparent: { ios: true, android: false },
    // Liquid Glass replaces blur on iOS 26; older iOS gets the standard translucent material.
    headerBlurEffect: Platform.OS === 'ios' && !isIOS26 ? ('systemChromeMaterial' as const) : undefined,
    headerShadowVisible: false,
    // iOS 26: SwiftUI lists use the soft scroll edge; the default draws a hard band with a dividing line under the bar.
    scrollEdgeEffects: isIOS26 ? { top: 'soft' as const, bottom: 'soft' as const } : undefined,
  };

  const rightContent = menu || right ? (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 18, paddingHorizontal: 6 }}>
      {menu ? <MenuButton menu={menu} /> : null}
      {right}
    </View>
  ) : null;
  return (
    <Stack.Screen
      options={{ ...options, headerLeft: left ? () => left : undefined, headerRight: rightContent ? () => rightContent : undefined }}
    />
  );
}

export interface HeaderMenu {
  icon: SymbolName;
  /** Accessibility label. */
  label: string;
  title?: string;
  /** Items grouped into sections (SwiftUI Picker/Divider groups). */
  groups: { title?: string; items: MenuItem[] }[];
}

function MenuButton({ menu }: { menu: HeaderMenu }) {
  const t = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Glyph name={menu.icon} size={24} color={t.label} onPress={() => setOpen(true)} accessibilityLabel={menu.label} />
      <ActionMenu visible={open} title={menu.title} onClose={() => setOpen(false)} sections={menu.groups.map((g) => g.items)} />
    </>
  );
}
