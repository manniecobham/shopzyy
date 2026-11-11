import { Glyph, type SymbolName } from './Glyph';
import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { colorFromHex, useTheme } from '../theme/theme';

export type IconName = SymbolName;

/** A grouped-list section like SwiftUI's `Section` inside a `Form`. */
export function FormSection({ header, footer, children }: { header?: string; footer?: ReactNode; children: ReactNode }) {
  const t = useTheme();
  return (
    <View style={s.section}>
      {header ? <Text style={[s.header, { color: t.secondaryLabel }]}>{header.toUpperCase()}</Text> : null}
      <View style={[s.card, { backgroundColor: t.cell }]}>{children}</View>
      {typeof footer === 'string' ? <Text style={[s.footer, { color: t.secondaryLabel }]}>{footer}</Text> : footer}
    </View>
  );
}

/** One row in a FormSection; draws the hairline separator between rows. */
export function FormRow({ children, last, style, onPress, disabled }: {
  children: ReactNode; last?: boolean; style?: StyleProp<ViewStyle>; onPress?: () => void; disabled?: boolean;
}) {
  const t = useTheme();
  const inner = [s.row, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.separator }, style];
  if (!onPress) return <View style={inner}>{children}</View>;
  return (
    <Pressable onPress={onPress} disabled={disabled} style={({ pressed }) => [inner, pressed && { backgroundColor: t.fill }]}>
      {children}
    </Pressable>
  );
}

/** `.borderedProminent` button: filled accent, white label. */
export function ProminentButton({ title, onPress, disabled, busy, style }: {
  title: string; onPress: () => void; disabled?: boolean; busy?: boolean; style?: StyleProp<ViewStyle>;
}) {
  const t = useTheme();
  const off = disabled || busy;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={off}
      style={({ pressed }) => [s.prominent, { backgroundColor: t.accent, opacity: off ? 0.45 : pressed ? 0.8 : 1 }, style]}
    >
      {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.prominentText}>{title}</Text>}
    </Pressable>
  );
}

/** Plain text button in the accent colour. */
export function TextButton({ title, onPress, destructive, disabled, style }: {
  title: string; onPress: () => void; destructive?: boolean; disabled?: boolean; style?: StyleProp<TextStyle>;
}) {
  const t = useTheme();
  return (
    <Pressable accessibilityRole="button" onPress={onPress} disabled={disabled} hitSlop={8}>
      {({ pressed }) => (
        <Text style={[{ fontSize: 17, color: destructive ? t.red : t.accent, opacity: disabled ? 0.4 : pressed ? 0.5 : 1 }, style]}>{title}</Text>
      )}
    </Pressable>
  );
}

/** The member's emoji on a tinted circle. */
export function MemberBadge({ emoji, colorHex, size = 28 }: { emoji?: string | null; colorHex?: string | null; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, alignItems: 'center', justifyContent: 'center', backgroundColor: colorFromHex(colorHex ?? '#8E8E93', 0.22) }}>
      <Text style={{ fontSize: size * 0.55 }}>{emoji ?? '👤'}</Text>
    </View>
  );
}

export function Icon({ name, size = 22, color }: { name: IconName; size?: number; color?: string }) {
  const t = useTheme();
  return <Glyph name={name} size={size} color={color ?? t.accent} />;
}

const s = StyleSheet.create({
  section: { marginTop: 22 },
  header: { fontSize: 13, marginLeft: 32, marginBottom: 7 },
  card: { marginHorizontal: 16, borderRadius: 10, overflow: 'hidden' },
  footer: { fontSize: 13, marginHorizontal: 32, marginTop: 7 },
  row: { minHeight: 44, paddingHorizontal: 16, paddingVertical: 10, flexDirection: 'row', alignItems: 'center' },
  prominent: { minHeight: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  prominentText: { color: '#fff', fontSize: 17, fontWeight: '600' },
});
