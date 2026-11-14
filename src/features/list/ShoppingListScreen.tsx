import { Glyph, type SymbolName } from '../../components/Glyph';
import { t as tr } from '../../i18n';
import { useIsFocused } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useShake } from '../../lib/useShake';
import { Alert, Keyboard, KeyboardAvoidingView, Platform, SectionList, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LoadingOverlay } from '../../components/LogoAnimation';
import { ScreenOptions } from '../../components/NativeHeader';
import { SuggestionEngine } from '../../logic/SuggestionEngine';
import { ShoppingTrip } from '../../logic/ShoppingTrip';
import { makeSections } from '../../logic/listGrouping';
import { continuesClosedTrip, totalMatchesTrip, tripSkipKey } from '../../logic/tripTotals';
import { LIST_GROUPINGS, groupingIcon, groupingTitle } from '../../models/enums';
import type { GroceryItem, Household } from '../../models/entities';
import { itemHistory, purchaseItemName, purchaseMemberName, purchaseQuantityText } from '../../models/itemOps';
import { useAccount, useAppState, useStoreVersion } from '../../runtime/RuntimeProvider';
import type { ParsedReceipt } from '../../logic/receiptParser';
import { importReceipt } from '../../services/receiptImport';
import { scanReceipt, type ReceiptSource } from '../../services/receiptScanner';
import { SkippedTrips } from '../../services/SkippedTrips';
import { StorageKeys } from '../../services/storageKeys';
import { isIOS26, useTheme } from '../../theme/theme';
import { ListBackdrop, ListSectionHeader } from '../household/HouseholdBackground';
import { HouseholdSwitcher } from '../household/HouseholdSwitcher';
import { ProfileMenu } from '../shared/ProfileMenu';
import { SyncStatusView } from '../shared/SyncStatusView';
import { ItemEditorView } from './ItemEditorView';
import { ItemRow } from './ItemRow';
import { ReceiptIntroSheet } from './ReceiptIntro';
import { ReceiptReviewSheet } from './ReceiptReview';
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
  const [reordering, setReordering] = useState(false);
  const [collapsed, setCollapsed] = useState<ReadonlySet<string>>(new Set());
  const toggleSection = (title: string) => setCollapsed((c) => { const n = new Set(c); if (!n.delete(title)) n.add(title); return n; });
  const [tripTarget, setTripTarget] = useState<TripTotalTarget | null>(null);
  const [receipt, setReceipt] = useState<ParsedReceipt | null>(null);
  const [scanning, setScanning] = useState(false);
  const [intro, setIntro] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const [skippedKey, setSkippedKey] = useState<string | null>(null);

  const history = useRef<{ label: string; run: () => void }[]>([]);
  const asking = useRef(false);
  const record = (label: string, run: () => void) => { history.current = [...history.current.slice(-19), { label, run }]; };
  const focused = useIsFocused();
  useShake(() => {
    const last = history.current[history.current.length - 1];
    if (!last || asking.current) return;
    asking.current = true;
    Alert.alert(tr('Undo last action?'), last.label, [
      { text: tr('Cancel'), style: 'cancel', onPress: () => { asking.current = false; } },
      { text: tr('Undo'), onPress: () => { history.current = history.current.slice(0, -1); last.run(); asking.current = false; } },
    ], { onDismiss: () => { asking.current = false; } });
  }, focused && !editing && !reordering && !tripTarget && !receipt && !scanning && !intro);

  const addText = (text: string) => {
    const before = list.snapshotItems();
    const added = list.addFromText(text, currentMember).filter((i) => {
      const b = before.get(i.id);
      return !b || b.isOnList !== i.isOnList || b.quantity !== i.quantity || b.unitRaw !== i.unitRaw;
    });
    if (added.length > 0) record(tr('Added {items}', { items: added.map((i) => i.name).join(', ') }), () => list.undoAdd(added, before));
  };

  const requestTickOff = (item: GroceryItem) => {
    if (!continuesClosedTrip(myLatestTrip, store.tripTotalsIn(household.id), new Date())) { tickOff(item); return; }
    Alert.alert(tr('Start a new trip?'), tr('You already added a total for your last trip. Add this item to that trip, or start a new one?'), [
      { text: tr('Add to last trip'), onPress: () => tickOff(item) },
      { text: tr('Start new trip'), onPress: () => tickOff(item, true) },
      { text: tr('Cancel'), style: 'cancel' },
    ]);
  };

  const tickOff = (item: GroceryItem, startsTrip = false) => {
    const name = item.name;
    const purchase = list.markBought(item, currentMember, new Date(), startsTrip);
    if (!purchase) return;
    record(tr('Ticked off {items}', { items: name }), () => {
      if (store.purchasesIn(household.id).some((p) => p.id === purchase.id)) list.undoPurchase(purchase);
    });
  };

  const scan = async (source: ReceiptSource) => {
    const result = await scanReceipt(source, () => setScanning(true)).finally(() => setScanning(false));
    if ('receipt' in result) { setReceipt(result.receipt); return; }
    if ('cancelled' in result) return;
    const message = result.error === 'permission' ? tr('Allow camera access in Settings to scan receipts.')
      : result.error === 'unsupported' ? tr("Receipt scanning isn't available in this version of the app.")
      : result.error === 'failed' ? tr('Something went wrong while reading the receipt. Please try again.')
      : tr("Couldn't read this receipt. Try a flat, well-lit photo of the whole receipt.");
    Alert.alert(tr('Scan receipt'), message);
  };

  const chooseSource = () => Alert.alert(tr('Scan receipt'), tr('The photo is read on this device and is never saved or uploaded. You can review everything before it is added.'), [
    { text: tr('Take photo'), onPress: () => void scan('camera') },
    { text: tr('Choose from library'), onPress: () => void scan('library') },
    { text: tr('Cancel'), style: 'cancel' },
  ]);

  const startScan = () => {
    if (prefs.getBool(StorageKeys.hasSeenReceiptIntro, false)) chooseSource(); else setIntro(true);
  };

  const insets = useSafeAreaInsets();
  const [keyboardUp, setKeyboardUp] = useState(false);
  useEffect(() => {
    const show = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setKeyboardUp(true));
    const hide = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKeyboardUp(false));
    return () => { show.remove(); hide.remove(); };
  }, []);
  const tabBarClearance = keyboardUp || Platform.OS !== 'ios' ? 0 : isIOS26 ? 84 : 49 + insets.bottom;

  const catalog = store.itemsIn(household.id);
  const listItems = catalog.filter((i) => i.isOnList);
  const members = store.membersOf(household.id);
  const currentMember = account.userRecordName ? store.member(account.userRecordName, household.id) ?? null : null;
  const sections = makeSections(listItems, household.groupingRaw, household.sectionOrder);

  const runningLow = useMemo(
    () => new SuggestionEngine().suggestions(catalog.map(itemHistory)).filter((s) => s.kind !== 'longTimeNoSee').slice(0, 8),
    [catalog, store.version], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const myLatestTrip = useMemo(() => {
    const mine = store.purchasesIn(household.id)
      .filter((p) => p.originDeviceID === prefs.deviceID)
      .sort((a, b) => b.purchasedAt.getTime() - a.purchasedAt.getTime())
      .slice(0, 40);
    const trips = ShoppingTrip.group(mine.map((p) => ({
      householdID: household.id, buyerKey: p.member?.userRecordName ?? null, buyerName: purchaseMemberName(p),
      purchase: { id: p.id, itemName: purchaseItemName(p), quantityText: purchaseQuantityText(p), startsTrip: p.startsTrip, purchasedAt: p.purchasedAt },
    })));
    return trips[trips.length - 1] ?? null;
  }, [store.version, household.id, prefs.deviceID]); // eslint-disable-line react-hooks/exhaustive-deps

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

  const data = sections.map((s) => ({ ...s, data: collapsed.has(s.title) ? [] : s.items }));

  return (
    <View style={{ flex: 1, backgroundColor: t.groupedBackground }}>
      <ScreenOptions title={tr('List')} left={<HouseholdSwitcher />} right={<ProfileMenu member={currentMember} />}
        menu={{
          icon: 'line.3.horizontal.decrease.circle', label: tr('Group and order the list'), title: tr('Group by'),
          groups: [
            { title: tr('Group by'), items: LIST_GROUPINGS.map((g) => ({ title: groupingTitle(g), icon: groupingIcon(g), checked: household.groupingRaw === g, onPress: () => households.setGrouping(g, household) })) },
            { items: [{ title: tr('Reorder sections…'), icon: 'arrow.up.arrow.down', disabled: sections.length < 2, onPress: () => setReordering(true) }] },
          ],
        }} />
      <View style={{ flex: 1 }}>
        <ListBackdrop household={household} />
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <SectionList
            sections={data}
            keyExtractor={(i) => i.id}
            keyboardShouldPersistTaps="handled"
            stickySectionHeadersEnabled={false}
            contentInsetAdjustmentBehavior="automatic"
            contentContainerStyle={{ paddingBottom: 16 }}
            ListHeaderComponent={<>
              <SyncStatusView />
              {runningLow.length > 0 ? (
                <View>
                  <ListSectionHeader title={tr('Running low?')} />
                  <SuggestionStrip suggestions={runningLow} onAdd={(s) => list.addToList(s.itemID, currentMember)} />
                </View>
              ) : null}
              {listItems.length === 0 ? (
                <View style={[s.empty, { backgroundColor: t.isDark ? 'rgba(44,44,46,0.8)' : 'rgba(255,255,255,0.8)' }]}>
                  <Glyph name="cart" size={42} color={t.secondaryLabel} />
                  <Text style={{ fontSize: 20, fontWeight: '600', color: t.label }}>{tr('Your list is empty')}</Text>
                  <Text style={{ fontSize: 15, color: t.secondaryLabel, textAlign: 'center' }}>{tr('Type below to add items. Try “2 kg rice, milk x2, eggs”.')}</Text>
                </View>
              ) : null}
            </>}
            renderSectionHeader={({ section }) => <ListSectionHeader title={section.title} count={section.items.length} collapsed={collapsed.has(section.title)} onToggle={() => toggleSection(section.title)} />}
            renderItem={({ item, index, section }) => (
              <ItemRow item={item} first={index === 0} last={index === section.items.length - 1}
                onBought={() => requestTickOff(item)} onEdit={() => setEditing(item)} onRemove={() => list.removeFromList(item)} />
            )}
          />
          <View style={{ marginBottom: tabBarClearance }}>
            {tripAwaitingTotal ? (
              <TripTotalBanner onAdd={() => setTripTarget(targetForTrip(tripAwaitingTotal, tripSkipKey(tripAwaitingTotal)))} onSkip={() => skip(tripSkipKey(tripAwaitingTotal))} />
            ) : null}
            <SmartAddBar catalog={catalog} onSubmit={addText} onScan={startScan} />
          </View>
        </KeyboardAvoidingView>
      </View>

      {editing ? <ItemEditorView item={editing} householdID={household.id} onClose={() => setEditing(null)} /> : null}
      {reordering ? <SectionOrderSheet household={household} sections={sections} onClose={() => setReordering(false)} /> : null}
      {intro ? (
        <ReceiptIntroSheet onCancel={() => setIntro(false)} onContinue={() => {
          prefs.setBool(StorageKeys.hasSeenReceiptIntro, true);
          setIntro(false);
          setTimeout(chooseSource, 450);
        }} />
      ) : null}
      <LoadingOverlay visible={scanning} message={tr('Reading receipt…')} />
      {receipt ? (
        <ReceiptReviewSheet receipt={receipt} household={household} listItems={listItems} onCancel={() => setReceipt(null)}
          onConfirm={(r) => {
            setReceipt(null);
            const done = importReceipt({ list, households, householdID: household.id, by: currentMember, ...r });
            if (done.count > 0) record(tr('Scanned receipt'), done.undo);
          }} />
      ) : null}
      {tripTarget ? <TripTotalSheet target={tripTarget} household={household} onSkip={() => skip(tripTarget.skipKey)} onClose={() => setTripTarget(null)} /> : null}
    </View>
  );
}

const s = StyleSheet.create({
  empty: { marginHorizontal: 16, marginTop: 16, padding: 24, borderRadius: 20, alignItems: 'center', gap: 8 },
});
