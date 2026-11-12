import { LinearGradient } from 'expo-linear-gradient';
import { t } from '../../i18n';
import { useEffect, useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { themeColors, themeEmoji } from '../../models/enums';
import type { Household } from '../../models/entities';
import { Glyph } from '../../components/Glyph';
import { colorFromHex, useTheme } from '../../theme/theme';

export const householdDisplayName = (h: Household) => (h.name === '' ? t('Shared household') : h.name);
const imageUri = (h: Household) => (h.customImage ? `data:image/jpeg;base64,${h.customImage}` : null);

/** The household's chosen photo, or its mood template. */
export function HouseholdBackground({ household, emojiSize = 44 }: { household: Household; emojiSize?: number | null }) {
  const uri = imageUri(household);
  if (uri) return <FocusedImage uri={uri} focusX={household.imageFocusX} focusY={household.imageFocusY} />;
  return <HouseholdThemeArt theme={household.themeRaw} emojiSize={emojiSize} />;
}

/** A photo filled into its container, anchored at a focal point (0…1 from left / top). */
export function FocusedImage({ uri, focusX = 0.5, focusY = 0.5 }: { uri: string; focusX?: number; focusY?: number }) {
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  useEffect(() => {
    let live = true;
    Image.getSize(uri, (w, h) => { if (live) setSize({ w, h }); }, () => {});
    return () => { live = false; };
  }, [uri]);

  let frame = null;
  if (box && size) {
    const scale = Math.max(box.w / Math.max(size.w, 1), box.h / Math.max(size.h, 1));
    const w = size.w * scale;
    const h = size.h * scale;
    frame = <Image source={{ uri }} style={{ width: w, height: h, position: 'absolute', left: -(w - box.w) * focusX, top: -(h - box.h) * focusY }} />;
  }
  return <View style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]} onLayout={(e) => setBox({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>{frame}</View>;
}

/** A mood template: gradient plus a large, softly tilted emoji. */
export function HouseholdThemeArt({ theme, emojiSize = 44 }: { theme: Household['themeRaw']; emojiSize?: number | null }) {
  const th = useTheme();
  const colors = themeColors(theme);
  const emoji = themeEmoji(theme);
  if (colors.length === 0) return <View style={[StyleSheet.absoluteFill, { backgroundColor: th.groupedBackground }]} />;
  return (
    <LinearGradient colors={colors as [string, string]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill}>
      {emojiSize && emoji ? (
        <Text style={{ position: 'absolute', top: 14, right: 14, fontSize: emojiSize, opacity: 0.85, transform: [{ rotate: '-12deg' }] }} accessibilityElementsHidden>{emoji}</Text>
      ) : null}
    </LinearGradient>
  );
}

/** Fills the screen behind the shopping list with the household's mood or photo, softened so rows stay readable. */
export function ListBackdrop({ household }: { household: Household }) {
  const th = useTheme();
  const washed = household.customImage !== null || household.themeRaw !== 'none';
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" accessibilityElementsHidden>
      <HouseholdBackground household={household} emojiSize={120} />
      {washed ? (
        <LinearGradient colors={[colorFromHex(th.groupedBackground, 0.35), colorFromHex(th.groupedBackground, 0.7)]} style={StyleSheet.absoluteFill} />
      ) : null}
    </View>
  );
}

export function ListSectionHeader({ title, count, collapsed, onToggle }: { title: string; count?: number | null; collapsed?: boolean; onToggle?: () => void }) {
  const th = useTheme();
  const label = count != null ? t('{title}, {n} items', { title, n: count }) : title;
  return (
    <View style={s.headerWrap}>
      <Pressable disabled={!onToggle} onPress={onToggle} accessibilityRole={onToggle ? 'button' : undefined} accessibilityLabel={label}
        accessibilityState={onToggle ? { expanded: !collapsed } : undefined} hitSlop={8}
        style={[s.pill, { backgroundColor: th.isDark ? 'rgba(44,44,46,0.82)' : 'rgba(255,255,255,0.82)' }]}>
        <Text style={{ fontSize: 15, fontWeight: '600', color: th.label }}>{title}</Text>
        {count != null ? <Text style={{ fontSize: 15, fontWeight: '600', color: th.secondaryLabel }}>{count}</Text> : null}
        {onToggle ? <Glyph name={collapsed ? 'chevron.right' : 'chevron.down'} size={13} color={th.secondaryLabel} /> : null}
      </Pressable>
    </View>
  );
}

/** A small round preview of the household background, for the switcher. */
export function HouseholdThumbnail({ household, size = 26 }: { household: Household; size?: number }) {
  const th = useTheme();
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: th.separator }}>
      <HouseholdBackground household={household} emojiSize={null} />
    </View>
  );
}

const s = StyleSheet.create({
  headerWrap: { paddingLeft: 36, paddingRight: 16, paddingTop: 18, paddingBottom: 6, alignItems: 'flex-start' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999 },
});
