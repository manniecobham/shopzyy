import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/theme';

/** An inline navigation bar: leading control, centred title, trailing controls (SwiftUI `.navigationBarTitleDisplayMode(.inline)`). */
export function ScreenHeader({ title, leading, trailing }: { title: string; leading?: ReactNode; trailing?: ReactNode }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[s.bar, { paddingTop: insets.top, backgroundColor: t.isDark ? 'rgba(28,28,30,0.94)' : 'rgba(249,249,249,0.94)', borderBottomColor: t.separator }]}>
      <View style={s.row}>
        <View style={[s.side, { alignItems: 'flex-start' }]}>{leading}</View>
        <Text style={[s.title, { color: t.label }]} numberOfLines={1} accessibilityRole="header">{title}</Text>
        <View style={[s.side, { alignItems: 'flex-end', flexDirection: 'row', justifyContent: 'flex-end', gap: 14 }]}>{trailing}</View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  bar: { borderBottomWidth: StyleSheet.hairlineWidth },
  row: { height: 44, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16 },
  side: { flex: 1.3 },
  title: { fontSize: 17, fontWeight: '600', textAlign: 'center' },
});
