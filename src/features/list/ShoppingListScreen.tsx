import { Ionicons } from '@expo/vector-icons';
import { useEffect, useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, SectionList, StyleSheet, Text, View } from 'react-native';
import { ActionMenu } from '../../components/Sheet';
import { ScreenHeader } from '../../components/ScreenHeader';
import { SuggestionEngine } from '../../logic/SuggestionEngine';
import { ShoppingTrip } from '../../logic/ShoppingTrip';
import { makeSections } from '../../logic/listGrouping';
import { totalMatchesTrip, tripSkipKey } from '../../logic/tripTotals';
import { LIST_GROUPINGS, groupingIcon, groupingTitle } from '../../models/enums';
import type { GroceryItem, Household } from '../../models/entities';
import { itemHistory, purchaseItemName, purchaseMemberName } from '../../models/itemOps';
import { useAccount, useAppState, useStoreVersion } from '../../runtime/RuntimeProvider';
import { SkippedTrips } from '../../services/SkippedTrips';
import { useTheme } from '../../theme/theme';
import { ListBackdrop, ListSectionHeader } from '../household/HouseholdBackground';
import { HouseholdSwitcher } from '../household/HouseholdSwitcher';
import { ProfileMenu } from '../shared/ProfileMenu';
import { SyncStatusView } from '../shared/SyncStatusView';
import { ItemEditorView } from './ItemEditorView';
import { ItemRow } from './ItemRow';
import { SectionOrderSheet } from './SectionOrderSheet';
import { SmartAddBar } from './SmartAddBar';
import { SuggestionStrip } from './SuggestionStrip';
import { TripTotalBanner, TripTotalSheet, targetForTrip, type TripTotalTarget } from './TripTotal';

const DAY_MS = 24 * 60 * 60 * 1000;

export function ShoppingListScreen({ household }: { household: Household }) {
  const t = useTheme();
  const runtime = useAppState();
  const account = useAccount();
  useStoreVersion();
  const { store, prefs, households } = runtime;
  const list = runtime.list(household.id);

  const [editing, setEditing] = useState<GroceryItem | null>(null);
  const [groupMenu, setGroupMenu] = useState(false);
  const [reordering, setReordering] = useState(false);
  const [tripTarget, setTripTarget] = useState<TripTotalTarget | null>(null);
  const [now, setNow] = useState(() => new Date());
  const [skippedKey, setSkippedKey] = useState<string | null>(null);

  const catalog = store.itemsIn(household.id);
  const listItems = catalog.filter((i) => i.isOnList);
  const members = store.membersOf(household.id);
  const currentMember = account.userRecordName ? store.member(account.userRecordName, household.id) ?? null : null;
  const sections = makeSections(listItems, household.groupingRaw, household.sectionOrder);

  const runningLow = useMemo(
    () => new SuggestionEngine().suggestions(catalog.map(itemHistory)).filter((s) => s.kind !== 'longTimeNoSee').slice(0, 8),
    [catalog, store.version], // eslint-disable-line react-hooks/exhaustive-deps
  );

  // The trip this person is currently doing, or just finished: built from purchases made on this device.
  const myLatestTrip = useMemo(() => {
    const mine = store.purchasesIn(household.id)
      .filter((p) => p.originDeviceID === prefs.deviceID)
      .sort((a, b) => b.purchasedAt.getTime() - a.purchasedAt.getTime())
      .slice(0, 40);
    const trips = ShoppingTrip.group(mine.map((p) => ({
      householdID: household.id, buyerKey: p.member?.userRecordName ?? null, buyerName: purchaseMemberName(p),
      purchase: { id: p.id, itemName: purchaseItemName(p), purchasedAt: p.purchasedAt },
    })));
    return trips[trips.length - 1] ?? null;
  }, [store.version, household.id, prefs.deviceID]); // eslint-disable-line react-hooks/exhaustive-deps

  // Set once the trip has been quiet for `promptDelay` (seconds, not the minutes other members wait),
  // and only while it has no total and hasn't been skipped.
  const tripAwaitingTotal = (() => {
    const trip = myLatestTrip;
    if (!trip) return null;
    const key = tripSkipKey(trip);
    if (now.getTime() < trip.promptAt.getTime() || now.getTime() - trip.end.getTime() >= DAY_MS) return null;
    if (key === skippedKey || SkippedTrips.contains(prefs, key)) return null;
    if (store.tripTotalsIn(household.id).some((x) => totalMatchesTrip(x, trip))) return null;
    return trip;
  })();

  // Waits out the quiet period so the banner appears by itself.
  useEffect(() => {
    if (!myLatestTrip) return;
    const delay = myLatestTrip.promptAt.getTime() - Date.now();
    if (delay <= 0) { setNow(new Date()); return; }
    const id = setTimeout(() => setNow(new Date()), delay + 1000);
    return () => clearTimeout(id);
  }, [myLatestTrip?.id, myLatestTrip?.purchases.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const skip = (key: string) => { SkippedTrips.insert(prefs, key); setSkippedKey(key); };

  const data = sections.map((s) => ({ ...s, data: s.items }));

  return (
    <View style={{ flex: 1, backgroundColor: t.groupedBackground }}>
      <ScreenHeader title="List" leading={<HouseholdSwitcher />}
        trailing={<>
          <Ionicons name="filter-circle-outline" size={26} color={t.accent} onPress={() => setGroupMenu(true)} accessibilityLabel="Group and order the list" />
          <ProfileMenu member={currentMember} />
        </>} />
      <View style={{ flex: 1 }}>
        <ListBackdrop household={household} />
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <SectionList
            sections={data}
            keyExtractor={(i) => i.id}
            keyboardShouldPersistTaps="handled"
            stickySectionHeadersEnabled={false}
            contentContainerStyle={{ paddingBottom: 16 }}
            ListHeaderComponent={<>
              <SyncStatusView />
              {runningLow.length > 0 ? (
                <View>
                  <ListSectionHeader title="Running low?" />
                  <SuggestionStrip suggestions={runningLow} onAdd={(s) => list.addToList(s.itemID, currentMember)} />
                </View>
              ) : null}
              {listItems.length === 0 ? (
                <View style={[s.empty, { backgroundColor: t.isDark ? 'rgba(44,44,46,0.8)' : 'rgba(255,255,255,0.8)' }]}>
                  <Ionicons name="cart-outline" size={42} color={t.secondaryLabel} />
                  <Text style={{ fontSize: 20, fontWeight: '600', color: t.label }}>Your list is empty</Text>
                  <Text style={{ fontSize: 15, color: t.secondaryLabel, textAlign: 'center' }}>Type below to add items. Try “2 kg rice, milk x2, eggs”.</Text>
                </View>
              ) : null}
            </>}
            renderSectionHeader={({ section }) => <ListSectionHeader title={section.title} count={section.items.length} />}
            renderItem={({ item, index, section }) => (
              <ItemRow item={item} first={index === 0} last={index === section.items.length - 1}
                onBought={() => list.markBought(item, currentMember)} onEdit={() => setEditing(item)} onRemove={() => list.removeFromList(item)} />
            )}
          />
          <View>
            {tripAwaitingTotal ? (
              <TripTotalBanner onAdd={() => setTripTarget(targetForTrip(tripAwaitingTotal, tripSkipKey(tripAwaitingTotal)))} onSkip={() => skip(tripSkipKey(tripAwaitingTotal))} />
            ) : null}
            <SmartAddBar catalog={catalog} onSubmit={(text) => list.addFromText(text, currentMember)} />
          </View>
        </KeyboardAvoidingView>
      </View>

      <ActionMenu visible={groupMenu} title="Group by" onClose={() => setGroupMenu(false)} sections={[
        LIST_GROUPINGS.map((g) => ({ title: groupingTitle(g), icon: groupingIcon(g) as never, checked: household.groupingRaw === g, onPress: () => households.setGrouping(g, household) })),
        [{ title: 'Reorder sections…', icon: 'swap-vertical', disabled: sections.length < 2, onPress: () => setReordering(true) }],
      ]} />
      {editing ? <ItemEditorView item={editing} householdID={household.id} onClose={() => setEditing(null)} /> : null}
      {reordering ? <SectionOrderSheet household={household} sections={sections} onClose={() => setReordering(false)} /> : null}
      {tripTarget ? <TripTotalSheet target={tripTarget} household={household} onSkip={() => skip(tripTarget.skipKey)} onClose={() => setTripTarget(null)} /> : null}
    </View>
  );
}

const s = StyleSheet.create({
  empty: { marginHorizontal: 16, marginTop: 16, padding: 24, borderRadius: 20, alignItems: 'center', gap: 8 },
});
