import { Glyph, type SymbolName } from '../../components/Glyph';
import { t as tr } from '../../i18n';
import { useMemo, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { rankAutocomplete, type AutocompleteCandidate } from '../../logic/AutocompleteRanker';
import { CategoryClassifier } from '../../logic/CategoryClassifier';
import { NameNormalizer } from '../../logic/NameNormalizer';
import { SmartItemParser } from '../../logic/SmartItemParser';
import { categoryEmoji, describeQuantity, plainQuantity, unitInputToken } from '../../models/enums';
import type { GroceryItem } from '../../models/entities';
import { autocompleteCandidate, itemCategory } from '../../models/itemOps';
import { colorFromHex, useTheme } from '../../theme/theme';

const SEPARATORS = /[,;\n+]/;

/**
 * The single entry point for adding items. Understands quantities and units, several items
 * at once, and autocompletes from what the household has bought before.
 */
export function SmartAddBar({ catalog, onSubmit }: { catalog: GroceryItem[]; onSubmit: (text: string) => void }) {
  const t = useTheme();
  const input = useRef<React.ComponentRef<typeof TextInput>>(null);
  const [text, setText] = useState('');
  const [focused, setFocused] = useState(false);

  const trimmed = text.trim();
  const segments = text.split(SEPARATORS);
  const active = SmartItemParser.parseSegment(segments[segments.length - 1]);
  const parsed = useMemo(() => SmartItemParser.parse(text), [text]);

  const matches = useMemo<AutocompleteCandidate[]>(
    () => (active ? rankAutocomplete(active.name, catalog.map(autocompleteCandidate)) : []),
    [active?.name, catalog], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const known = (name: string) => {
    const key = NameNormalizer.key(name);
    return catalog.find((i) => i.normalizedName === key);
  };

  const preview = parsed.map((item) => {
    const k = known(item.name);
    const category = k ? itemCategory(k) : CategoryClassifier.classify(item.name);
    const amount = describeQuantity(item.quantity, item.unit);
    return `${categoryEmoji(category)} ${amount ? `${amount} ` : ''}${item.name}`;
  }).join('   ');

  const submit = () => {
    if (!trimmed) return;
    onSubmit(trimmed);
    setText('');
    input.current?.focus();
  };

  /** Swaps the partially typed last item for the chosen one, keeping any quantity already typed ("2 kg chi" → "2 kg Chicken breast"), then adds. */
  const complete = (match: AutocompleteCandidate) => {
    const parts = [...segments];
    let prefix = '';
    if (active?.hasExplicitQuantity) prefix = plainQuantity(active.quantity) + (active.unit ? ` ${unitInputToken(active.unit)}` : '') + ' ';
    parts[parts.length - 1] = prefix + match.name;
    const joined = parts.join(', ').trim();
    onSubmit(joined);
    setText('');
    input.current?.focus();
  };

  return (
    <View style={[s.bar, { backgroundColor: t.isDark ? 'rgba(28,28,30,0.94)' : 'rgba(249,249,249,0.94)', borderTopColor: t.separator }]}>
      {focused && matches.length > 0 ? (
        <ScrollView horizontal keyboardShouldPersistTaps="always" showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }} style={{ marginBottom: 8 }}>
          {matches.map((m) => (
            <Pressable key={m.id} onPress={() => complete(m)} accessibilityHint={m.isOnList ? tr('Already on the list') : tr('Adds to the list')}
              style={[s.chip, { backgroundColor: colorFromHex(t.accent, m.isOnList ? 0.08 : 0.15) }]}>
              <Glyph name={m.isOnList ? 'checkmark' : 'plus'} size={13} color={t.accent} />
              <Text style={{ fontSize: 15, color: t.label }}>{m.name}</Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      {parsed.length > 0 ? <Text numberOfLines={2} style={[s.preview, { color: t.secondaryLabel }]} accessibilityLabel={tr('Will add {items}', { items: preview })}>{preview}</Text> : null}

      <View style={[s.field, { backgroundColor: t.fill }]}>
        <Glyph name="sparkles" size={18} color={t.accent} />
        <TextInput
          ref={input} value={text} onChangeText={setText} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          placeholder={tr('Add items, e.g. 2 kg rice, milk x2')} placeholderTextColor={t.tertiaryLabel}
          style={{ flex: 1, fontSize: 17, color: t.label, paddingVertical: 0 }} autoCorrect={false} returnKeyType="done"
          onSubmitEditing={submit} blurOnSubmit={false}
        />
        {trimmed ? (
          <Pressable onPress={submit} accessibilityLabel={tr('Add to list')} hitSlop={8}><Glyph name="arrow.up.circle.fill" size={30} color={t.accent} /></Pressable>
        ) : null}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  bar: { paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999 },
  preview: { fontSize: 12, paddingHorizontal: 24, marginBottom: 6 },
  field: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 999, minHeight: 44 },
});
