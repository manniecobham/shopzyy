import { Glyph, type SymbolName } from '../../components/Glyph';
import { t as tr } from '../../i18n';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { suggestionReason, suggestionShortReason, type Suggestion } from '../../logic/SuggestionEngine';
import { useTheme } from '../../theme/theme';

/** Horizontal one-tap shortcuts for items the household is likely to need. */
export function SuggestionStrip({ suggestions, onAdd }: { suggestions: Suggestion[]; onAdd: (s: Suggestion) => void }) {
  const t = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 32, paddingVertical: 4, gap: 10 }}>
      {suggestions.map((s) => (
        <Pressable key={s.itemID} onPress={() => onAdd(s)} accessibilityLabel={tr('Add {name}. {reason}', { name: s.name, reason: suggestionReason(s) })}
          style={({ pressed }) => ({ backgroundColor: t.cell, borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, gap: 3, opacity: pressed ? 0.7 : 1 })}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <Glyph name="plus.circle.fill" size={18} color={t.accent} />
            <Text style={{ fontSize: 15, fontWeight: '600', color: t.label }}>{s.name}</Text>
          </View>
          <Text style={{ fontSize: 11, color: s.kind === 'overdue' ? t.orange : t.secondaryLabel }}>{suggestionShortReason(s)}</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}
