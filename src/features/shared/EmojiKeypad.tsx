import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { EMOJI_CATEGORIES, SKIN_TONES, TONE_CATEGORIES, TONE_COLORS, categoryOf, supportsTone, toneOf, withTone } from '../../lib/emojiData';
import { colorFromHex, useTheme } from '../../theme/theme';

const baseOf = (emoji: string): string => {
  const tone = toneOf(emoji);
  return tone > 0 ? emoji.replace(SKIN_TONES[tone], '') : emoji;
};

export function EmojiKeypad({ value, onChange }: { value: string; onChange: (emoji: string) => void }) {
  const th = useTheme();
  const [tone, setTone] = useState(toneOf(value));
  const base = baseOf(value);
  const [key, setKey] = useState(categoryOf(base) ?? EMOJI_CATEGORIES[0].key);
  const category = EMOJI_CATEGORIES.find((c) => c.key === key) ?? EMOJI_CATEGORIES[0];
  const hasTones = TONE_CATEGORIES.has(category.key);

  const chooseTone = (next: number) => {
    setTone(next);
    if (supportsTone(base)) onChange(withTone(base, next));
  };

  return (
    <View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[s.tabs, { borderBottomColor: th.separator }]}>
        {EMOJI_CATEGORIES.map((c) => (
          <Pressable key={c.key} onPress={() => setKey(c.key)} accessibilityRole="tab" accessibilityLabel={c.icon}
            accessibilityState={{ selected: c.key === key }}
            style={[s.tab, c.key === key && { backgroundColor: colorFromHex(th.accent, 0.18) }]}>
            <Text style={{ fontSize: 20 }}>{c.icon}</Text>
          </Pressable>
        ))}
      </ScrollView>
      {hasTones ? (
        <View style={s.tones}>
          {TONE_COLORS.map((color, n) => (
            <Pressable key={color} onPress={() => chooseTone(n)} hitSlop={6} accessibilityLabel={`Skin tone ${n}`} accessibilityState={{ selected: n === tone }}
              style={[s.tone, { backgroundColor: color }, n === tone && { borderColor: th.accent, borderWidth: 3 }]} />
          ))}
        </View>
      ) : null}
      <View style={s.grid}>
        {category.emoji.map((e) => {
          const shown = hasTones ? withTone(e, tone) : e;
          return (
            <Pressable key={e} onPress={() => onChange(shown)} accessibilityLabel={shown} accessibilityState={{ selected: shown === value }}
              style={[s.cell, shown === value && { backgroundColor: colorFromHex(th.accent, 0.18) }]}>
              <Text style={{ fontSize: 26 }}>{shown}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  tabs: { paddingHorizontal: 6, paddingVertical: 6, gap: 2, borderBottomWidth: StyleSheet.hairlineWidth },
  tab: { width: 42, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  tones: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 10 },
  tone: { width: 30, height: 30, borderRadius: 15, borderColor: 'transparent', borderWidth: 3 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', padding: 6 },
  cell: { width: '12.5%', height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
});
