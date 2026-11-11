import { Ionicons } from '@expo/vector-icons';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { ScreenHeader } from '../../components/ScreenHeader';
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
    <View style={{ flex: 1, backgroundColor: t.groupedBackground }}>
      <ScreenHeader title="Suggestions" leading={<HouseholdSwitcher />}
        trailing={urgent.length > 0 ? <TextButton title={`Add ${urgent.length} due`} onPress={() => urgent.forEach(add)} style={{ fontSize: 16 }} /> : undefined} />
      {suggestions.length === 0 ? (
        <View style={s.empty}>
          <Ionicons name="sparkles-outline" size={44} color={t.secondaryLabel} />
          <Text style={{ fontSize: 20, fontWeight: '600', color: t.label }}>Nothing to suggest yet</Text>
          <Text style={{ fontSize: 15, color: t.secondaryLabel, textAlign: 'center' }}>
            Mark items as bought from your list. After a couple of trips, Shopzyy learns your rhythm and suggests things before you run out.
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>
          {KINDS.map((kind) => {
            const group = suggestions.filter((x) => x.kind === kind);
            if (group.length === 0) return null;
            return (
              <FormSection key={kind} header={KIND_TITLE[kind]} footer={KIND_EXPLANATION[kind]}>
                {group.map((sug, i) => (
                  <SwipeRow key={sug.itemID}
                    leading={[{ label: 'Add', icon: 'add', color: t.accent, onPress: () => add(sug) }]}
                    trailing={[
                      { label: 'Next week', icon: 'moon-outline', color: t.orange, onPress: () => list.snooze(sug.itemID, 7) },
                      { label: 'Not needed', icon: 'hand-left-outline', color: '#8E8E93', onPress: () => list.snooze(sug.itemID, 90) },
                    ]}>
                    <View style={[s.row, { backgroundColor: t.cell, borderBottomWidth: i === group.length - 1 ? 0 : StyleSheet.hairlineWidth, borderBottomColor: t.separator }]}>
                      <View style={{ flex: 1, gap: 3 }}>
                        <Text style={{ fontSize: 17, fontWeight: '500', color: t.label }}>{sug.name}</Text>
                        <Text style={{ fontSize: 12, color: t.secondaryLabel }}>{suggestionReason(sug)}</Text>
                      </View>
                      <Ionicons name="add-circle" size={28} color={t.accent} onPress={() => add(sug)} accessibilityLabel={`Add ${sug.name} to the list`} />
                    </View>
                  </SwipeRow>
                ))}
              </FormSection>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 40 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12, minHeight: 56 },
});
