import { Stack } from 'expo-router';
import { useHeaderHeight } from 'expo-router/react-navigation';
import type { ReactNode } from 'react';
import { Platform, View } from 'react-native';
import { useState } from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeMenu } from './NativeMenu';
import type { MenuItem } from './Sheet';
import { Glyph, type SymbolName } from './Glyph';
import { useTheme } from '../theme/theme';

import { isIOS26 } from '../theme/theme';
export { isIOS26 };

export function useHeaderInset(): number {
  const height = useHeaderHeight();
  return Platform.OS === 'ios' ? height : 0;
}

export function useEmptyStateInset(): number {
  const header = useHeaderInset();
  const { bottom } = useSafeAreaInsets();
  if (Platform.OS !== 'ios') return 0;
  return header + (isIOS26 ? 84 : 49 + bottom);
}

export function ScreenOptions({ title, left, right, menu, largeTitle }: {
  title: string; left?: ReactNode; right?: ReactNode; menu?: HeaderMenu; largeTitle?: boolean;
}) {
  const options = {
    title,
    headerTitleAlign: 'center' as const,
    headerLargeTitle: largeTitle === true,
    headerLargeTitleShadowVisible: false,
    headerTransparent: { ios: true, android: false },
    // Liquid Glass replaces blur on iOS 26; older iOS gets the standard translucent material.
    headerBlurEffect: Platform.OS === 'ios' && !isIOS26 ? ('systemChromeMaterial' as const) : undefined,
    headerShadowVisible: false,
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
  label: string;
  title?: string;
  groups: { title?: string; items: MenuItem[] }[];
}

function MenuButton({ menu }: { menu: HeaderMenu }) {
  const t = useTheme();
  return (
    <NativeMenu label={menu.label} sections={menu.groups.map((g) => g.items)}>
      <Glyph name={menu.icon} size={24} color={t.label} />
    </NativeMenu>
  );
}
