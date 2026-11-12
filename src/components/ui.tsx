import { Glyph, type SymbolName } from './Glyph';
import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { CARD_RADIUS, colorFromHex, useTheme } from '../theme/theme';

export type IconName = SymbolName;

export function FormSection({ header, footer, children, first }: { header?: string; footer?: ReactNode; children: ReactNode; first?: boolean }) {
  const t = useTheme();
  const marginTop = first ? (header ? 11 : 0) : header ? 28 : 35;
  return (
    <View style={{ marginTop }}>
      {header ? <Text style={[s.header, { color: t.secondaryLabel }]}>{header}</Text> : null}
      <View style={[s.card, { backgroundColor: t.cell, borderRadius: CARD_RADIUS }]}>{children}</View>
      {typeof footer === 'string' ? <Text style={[s.footer, { color: t.secondaryLabel }]}>{footer}</Text> : footer}
    </View>
  );
}

export function FormRow({ children, last, style, onPress, disabled }: {
  children: ReactNode; last?: boolean; style?: StyleProp<ViewStyle>; onPress?: () => void; disabled?: boolean;
}) {
  const t = useTheme();
  const inner = [s.row, style];
  // The separator starts 20 pt in from the card's edge, like a SwiftUI Form.
  const line = last ? null : <View pointerEvents="none" style={{ position: 'absolute', left: 20, right: 20, bottom: 0, height: StyleSheet.hairlineWidth, backgroundColor: t.separator }} />;
  if (!onPress) return <View style={inner}>{children}{line}</View>;
  return (
    <Pressable onPress={onPress} disabled={disabled} style={({ pressed }) => [inner, pressed && { backgroundColor: t.fill }]}>
      {children}
      {line}
    </Pressable>
  );
}

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

export function TextButton({ title, onPress, destructive, disabled, style, color }: {
  title: string; onPress: () => void; destructive?: boolean; disabled?: boolean; style?: StyleProp<TextStyle>; color?: string;
}) {
  const t = useTheme();
  return (
    <Pressable accessibilityRole="button" onPress={onPress} disabled={disabled} hitSlop={8}>
      {({ pressed }) => (
        <Text style={[{ fontSize: 17, color: color ?? (destructive ? t.red : t.accent), opacity: disabled ? 0.4 : pressed ? 0.5 : 1 }, style]}>{title}</Text>
      )}
    </Pressable>
  );
}

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
  header: { fontSize: 17, fontWeight: '600', marginLeft: 36, marginBottom: 8 },
  card: { marginHorizontal: 16, overflow: 'hidden' },
  footer: { fontSize: 13, marginHorizontal: 36, marginTop: 8 },
  row: { minHeight: 51, paddingHorizontal: 20, paddingVertical: 12, flexDirection: 'row', alignItems: 'center' },
  prominent: { minHeight: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  prominentText: { color: '#fff', fontSize: 17, fontWeight: '600' },
});
