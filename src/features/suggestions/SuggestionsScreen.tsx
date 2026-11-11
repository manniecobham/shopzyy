import { Glyph, type SymbolName } from '../../components/Glyph';
import { t as tr } from '../../i18n';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { ScreenOptions } from '../../components/NativeHeader';
import { SwipeRow } from '../../components/SwipeRow';
import { FormSection, TextButton } from '../../components/ui';
import { KIND_EXPLANATION, KIND_TITLE, SuggestionEngine, suggestionReason, type Suggestion, type SuggestionKind } from '../../logic/SuggestionEngine';
import type { Household } from '../../models/entities';
import { itemHistory } from '../../models/itemOps';
import { useAccount, useRuntime, useStoreVersion } from '../../runtime/RuntimeProvider';
import { useTheme } from '../../theme/theme';
import { HouseholdSwitcher } from '../household/HouseholdSwitcher';

const KINDS: SuggestionKind[] = ['overdue', 'dueSoon', 'longTimeNoSee'];

/** What the household probably needs, grouped by how urgent it is. */
export function SuggestionsScreen({ household }: { household: Household }) {
  const t = useTheme();
  const runtime = useRuntime();
  const account = useAccount();
  useStoreVersion();
  const list = runtime.list(household.id);
  const member = account.userRecordName ? runtime.store.member(account.userRecordName, household.id) ?? null : null;

  const suggestions = new SuggestionEngine().suggestions(runtime.store.itemsIn(household.id).map(itemHistory));
  const urgent = suggestions.filter((s) => s.kind !== 'longTimeNoSee');
  const add = (s: Suggestion) => list.addToList(s.itemID, member);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: t.groupedBackground }} contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ flexGrow: 1, paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
      <ScreenOptions largeTitle title={tr('Suggestions')} left={<HouseholdSwitcher />}
        right={urgent.length > 0 ? <View style={{ paddingHorizontal: 12 }}><TextButton title={tr('Add {n} due', { n: urgent.length })} onPress={() => urgent.forEach(add)} color={t.label} style={{ fontSize: 17 }} /></View> : undefined} />
      {suggestions.length === 0 ? (
        <View style={s.empty}>
          <Glyph name="sparkles" size={44} color={t.secondaryLabel} />
          <Text style={{ fontSize: 20, fontWeight: '600', color: t.label }}>{tr('Nothing to suggest yet')}</Text>
          <Text style={{ fontSize: 15, color: t.secondaryLabel, textAlign: 'center' }}>
            {tr('Mark items as bought from your list. After a couple of trips, Shopzyy learns your rhythm and suggests things before you run out.')}
          </Text>
        </View>
      ) : (
        <>
          {KINDS.map((kind) => {
            const group = suggestions.filter((x) => x.kind === kind);
            if (group.length === 0) return null;
            return (
              <FormSection key={kind} header={KIND_TITLE[kind]} footer={KIND_EXPLANATION[kind]} first={kind === KINDS.find((k) => suggestions.some((x) => x.kind === k))}>
                {group.map((sug, i) => (
                  <SwipeRow key={sug.itemID}
                    leading={[{ label: tr('Add'), icon: 'plus', color: t.accent, onPress: () => add(sug) }]}
                    trailing={[
                      { label: tr('Next week'), icon: 'moon.zzz', color: t.orange, onPress: () => list.snooze(sug.itemID, 7) },
                      { label: tr('Not needed'), icon: 'hand.raised', color: '#8E8E93', onPress: () => list.snooze(sug.itemID, 90) },
                    ]}>
                    <View style={[s.row, { backgroundColor: t.cell }]}>
                      <View style={{ flex: 1, gap: 3, paddingRight: 28 }}>
                        <Text style={{ fontSize: 17, fontWeight: '500', color: t.label }}>{sug.name}</Text>
                        <Text style={{ fontSize: 12, color: t.secondaryLabel }}>{suggestionReason(sug)}</Text>
                      </View>
                      <Glyph name="plus.circle.fill" size={26} color={t.accent} onPress={() => add(sug)} accessibilityLabel={tr('Add {name} to the list', { name: sug.name })} />
                      {i === group.length - 1 ? null : <View pointerEvents="none" style={{ position: 'absolute', left: 20, right: 20, bottom: 0, height: StyleSheet.hairlineWidth, backgroundColor: t.separator }} />}
                    </View>
                  </SwipeRow>
                ))}
              </FormSection>
            );
          })}
        </>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 40 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 16, minHeight: 56 },
});
