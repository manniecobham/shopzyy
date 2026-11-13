import type { ReactNode } from 'react';
import { Platform, Pressable, View, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../theme/theme';
import { ActionMenu, useDropdown, type MenuItem } from './Sheet';

type MenuLib = typeof import('@react-native-menu/menu');

const lib = (): MenuLib | null => {
  try { return require('@react-native-menu/menu'); } catch { return null; }
};
const native = lib();

export function NativeMenu({ sections, label, children, style }: {
  sections: MenuItem[][]; label: string; children: ReactNode; style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  const dropdown = useDropdown();

  if (!native) {
    return (
      <>
        <View ref={dropdown.ref} collapsable={false} style={style}>
          <Pressable onPress={dropdown.open} accessibilityLabel={label}>{children}</Pressable>
        </View>
        <ActionMenu visible anchor={dropdown.anchor} onClose={dropdown.close} sections={sections} />
      </>
    );
  }

  const byID = new Map<string, MenuItem>();
  const action = (item: MenuItem, id: string) => {
    byID.set(id, item);
    return {
      id,
      title: item.title,
      image: Platform.OS === 'ios' ? item.icon : undefined,
      state: item.checked ? ('on' as const) : ('off' as const),
      attributes: { destructive: item.destructive, disabled: item.disabled },
    };
  };
  const grouped = Platform.OS === 'ios' && sections.length > 1;
  const actions = grouped
    ? sections.map((items, i) => ({ id: `group-${i}`, title: '', displayInline: true, subactions: items.map((item, j) => action(item, `${i}:${j}`)) }))
    : sections.flat().map((item, i) => action(item, String(i)));

  return (
    <native.MenuView
      actions={actions}
      themeVariant={t.isDark ? 'dark' : 'light'}
      onPressAction={({ nativeEvent }) => byID.get(nativeEvent.event)?.onPress()}
      style={style}
    >
      <View accessible accessibilityRole="button" accessibilityLabel={label}>{children}</View>
    </native.MenuView>
  );
}
