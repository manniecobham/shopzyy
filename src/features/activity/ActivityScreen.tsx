import { Glyph, type SymbolName } from '../../components/Glyph';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ActionMenu } from '../../components/Sheet';
import { ScreenOptions, useHeaderInset } from '../../components/NativeHeader';
import { SwipeRow } from '../../components/SwipeRow';
import { FormSection, MemberBadge, TextButton } from '../../components/ui';
import { formatCurrency } from '../../lib/format';
import {
  ACTIVITY_PERIODS, LATEST_COUNT, groupActivityTrips, periodSpend, periodTitle, tripsForPeriod, type ActivityPeriod, type ActivityTrip,
} from '../../logic/activityTrips';
import type { Household } from '../../models/entities';
import { purchaseItemName, purchaseQuantityText } from '../../models/itemOps';
import { useRuntime, useStoreVersion } from '../../runtime/RuntimeProvider';
import { useTheme } from '../../theme/theme';
import { HouseholdSwitcher } from '../household/HouseholdSwitcher';
import { TripTotalSheet, targetForTotal, targetForTrip, type TripTotalTarget } from '../list/TripTotal';
import { tripSkipKey } from '../../logic/tripTotals';

/** Shopping history: one row per trip, with who went, what it cost and, when opened, what was bought. Starts with the latest few trips; the filter menu widens it. */
export function ActivityScreen({ household }: { household: Household }) {
  const t = useTheme();
  const runtime = useRuntime();
  useStoreVersion();
  const inset = useHeaderInset();
  const { store } = runtime;
  const [memberFilter, setMemberFilter] = useState<string | null>(null);
  const [period, setPeriod] = useState<ActivityPeriod>('latest');
  const [menu, setMenu] = useState(false);
  const [editing, setEditing] = useState<TripTotalTarget | null>(null);

  const members = store.membersOf(household.id);
  const purchases = store.purchasesIn(household.id).filter((p) => memberFilter === null || p.member?.id === memberFilter);
  const all = groupActivityTrips(purchases, store.tripTotalsIn(household.id), household.id);
  const trips = tripsForPeriod(all, period);
  const spend = periodSpend(trips);
  const filtered = memberFilter !== null || period !== 'latest';

  const editTotal = (e: ActivityTrip) => setEditing(e.total ? targetForTotal(e.total) : targetForTrip(e.trip, tripSkipKey(e.trip)));

  return (
    <View style={{ flex: 1, backgroundColor: t.groupedBackground }}>
      <ScreenOptions title="Shopping history" left={<HouseholdSwitcher />}
        right={<Glyph name={filtered ? 'line.3.horizontal.decrease.circle.fill' : 'line.3.horizontal.decrease.circle'} size={26} color={t.accent} onPress={() => setMenu(true)} accessibilityLabel="Filter history" />} />
      {trips.length === 0 ? (
        <View style={[s.empty, { paddingTop: inset }]}>
          <Glyph name="bag" size={44} color={t.secondaryLabel} />
          <Text style={{ fontSize: 20, fontWeight: '600', color: t.label }}>{filtered ? 'No trips found' : 'No shopping yet'}</Text>
          <Text style={{ fontSize: 15, color: t.secondaryLabel, textAlign: 'center' }}>
            {filtered ? 'Try a different period or person.' : 'When anyone ticks items off the list, the trip shows up here with who went and what it cost.'}
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingTop: inset, paddingBottom: 32 }} scrollIndicatorInsets={{ top: inset }}>
          {spend ? (
            <FormSection>
              <View style={s.spend}>
                <Text style={{ fontSize: 15, color: t.label, flex: 1 }}>Spent {period === 'latest' ? 'on these trips' : periodTitle(period).toLowerCase()}</Text>
                <Text style={{ fontSize: 15, color: t.secondaryLabel }}>{formatCurrency(spend.amount, spend.currency)}</Text>
              </View>
            </FormSection>
          ) : null}
          {trips.map((entry) => (
            <FormSection key={entry.id}>
              <TripRow entry={entry} buyerEmoji={members.find((m) => m.userRecordName === entry.trip.buyerKey)} onEditTotal={() => editTotal(entry)}
                onUndo={(rec) => runtime.list(household.id).undoPurchase(rec)} />
            </FormSection>
          ))}
          {period === 'latest' && all.length > LATEST_COUNT ? (
            <FormSection><View style={s.more}><TextButton title="Show more trips" onPress={() => setPeriod('week')} /></View></FormSection>
          ) : null}
        </ScrollView>
      )}

      <ActionMenu visible={menu} title="Filter history" onClose={() => setMenu(false)} sections={[
        ACTIVITY_PERIODS.map((p) => ({ title: periodTitle(p), checked: period === p, onPress: () => setPeriod(p) })),
        [{ title: 'Everyone', checked: memberFilter === null, onPress: () => setMemberFilter(null) },
          ...members.map((m) => ({ title: `${m.emoji} ${m.name}`, checked: memberFilter === m.id, onPress: () => setMemberFilter(m.id) }))],
      ]} />
      {editing ? <TripTotalSheet target={editing} household={household} onSkip={() => {}} onClose={() => setEditing(null)} /> : null}
    </View>
  );
}

function TripRow({ entry, buyerEmoji: buyer, onEditTotal, onUndo }: {
  entry: ActivityTrip; buyerEmoji: { emoji: string; colorHex: string } | undefined; onEditTotal: () => void; onUndo: (r: ActivityTrip['records'][number]) => void;
}) {
  const t = useTheme();
  const [open, setOpen] = useState(false);
  const end = entry.trip.end;
  const now = new Date();
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  const yesterday = new Date(now.getTime() - 86_400_000);
  const time = end.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  const day = sameDay(end, now) ? 'Today' : sameDay(end, yesterday) ? 'Yesterday' : end.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });
  const count = entry.records.length === 1 ? '1 item' : `${entry.records.length} items`;
  const subtitle = [`${day}, ${time}`, count, entry.total?.storeName].filter(Boolean).join(' · ');

  return (
    <View>
      <Pressable onPress={() => setOpen(!open)} style={s.head} accessibilityRole="button" accessibilityState={{ expanded: open }}>
        <MemberBadge emoji={buyer?.emoji} colorHex={buyer?.colorHex} size={38} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ fontSize: 15, fontWeight: '600', color: t.label }}>{entry.trip.buyerName}</Text>
          <Text style={{ fontSize: 12, color: t.secondaryLabel }}>{subtitle}</Text>
        </View>
        <Pressable onPress={onEditTotal} hitSlop={8} accessibilityLabel={entry.total ? `Edit total, ${formatCurrency(entry.total.amount, entry.total.currencyCode)}` : 'Add total'}>
          <Text style={{ fontSize: entry.total ? 15 : 12, fontWeight: '600', color: entry.total ? t.label : t.accent }}>
            {entry.total ? formatCurrency(entry.total.amount, entry.total.currencyCode) : 'Add total'}
          </Text>
        </Pressable>
        <Glyph name={open ? 'chevron.down' : 'chevron.right'} size={16} color={t.tertiaryLabel} />
      </Pressable>
      {open ? entry.records.map((r) => (
        <SwipeRow key={r.id} trailing={[{ label: 'Undo', icon: 'arrow.uturn.backward', color: t.red, onPress: () => onUndo(r) }]}>
          <View style={[s.line, { backgroundColor: t.cell, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.separator }]}>
            <Text style={{ fontSize: 15, color: t.label, flex: 1 }}>{purchaseItemName(r)}</Text>
            {purchaseQuantityText(r) ? <Text style={{ fontSize: 15, color: t.secondaryLabel }}>{purchaseQuantityText(r)}</Text> : null}
          </View>
        </SwipeRow>
      )) : null}
    </View>
  );
}

const s = StyleSheet.create({
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 40 },
  spend: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  line: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, paddingLeft: 66 },
  more: { alignItems: 'center', paddingVertical: 12 },
});
