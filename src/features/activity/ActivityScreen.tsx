import { Glyph, type SymbolName } from '../../components/Glyph';
import { locale, t, tn } from '../../i18n';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ScreenOptions } from '../../components/NativeHeader';
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
  const th = useTheme();
  const runtime = useRuntime();
  useStoreVersion();
  const { store } = runtime;
  const [memberFilter, setMemberFilter] = useState<string | null>(null);
  const [period, setPeriod] = useState<ActivityPeriod>('latest');
  const [editing, setEditing] = useState<TripTotalTarget | null>(null);

  const members = store.membersOf(household.id);
  const purchases = store.purchasesIn(household.id).filter((p) => memberFilter === null || p.member?.id === memberFilter);
  const all = groupActivityTrips(purchases, store.tripTotalsIn(household.id), household.id);
  const trips = tripsForPeriod(all, period);
  const spend = periodSpend(trips);
  const filtered = memberFilter !== null || period !== 'latest';

  const editTotal = (e: ActivityTrip) => setEditing(e.total ? targetForTotal(e.total) : targetForTrip(e.trip, tripSkipKey(e.trip)));

  return (
    <ScrollView style={{ flex: 1, backgroundColor: th.groupedBackground }} contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ flexGrow: 1, paddingBottom: 32 }} keyboardShouldPersistTaps="handled">
      <ScreenOptions largeTitle title={t('Shopping history')} left={<HouseholdSwitcher />}
        menu={{
          icon: filtered ? 'line.3.horizontal.decrease.circle.fill' : 'line.3.horizontal.decrease.circle', label: t('Filter history'), title: t('Filter history'),
          groups: [
            { title: t('Period'), items: ACTIVITY_PERIODS.map((p) => ({ title: t(periodTitle(p)), checked: period === p, onPress: () => setPeriod(p) })) },
            { title: t('Person'), items: [{ title: t('Everyone'), checked: memberFilter === null, onPress: () => setMemberFilter(null) },
              ...members.map((m) => ({ title: `${m.emoji} ${m.name}`, checked: memberFilter === m.id, onPress: () => setMemberFilter(m.id) }))] },
          ],
        }} />
      {trips.length === 0 ? (
        <View style={s.empty}>
          <Glyph name="bag" size={44} color={th.secondaryLabel} />
          <Text style={{ fontSize: 20, fontWeight: '600', color: th.label }}>{filtered ? t('No trips found') : t('No shopping yet')}</Text>
          <Text style={{ fontSize: 15, color: th.secondaryLabel, textAlign: 'center' }}>
            {filtered ? t('Try a different period or person.') : t('When anyone ticks items off the list, the trip shows up here with who went and what it cost.')}
          </Text>
        </View>
      ) : (
        <>
          {spend ? (
            <FormSection first>
              <View style={s.spend}>
                <Text style={{ fontSize: 15, color: th.label, flex: 1 }}>{period === 'latest' ? t('Spent on these trips') : t('Spent {period}', { period: t(periodTitle(period)).toLowerCase() })}</Text>
                <Text style={{ fontSize: 15, color: th.secondaryLabel }}>{formatCurrency(spend.amount, spend.currency)}</Text>
              </View>
            </FormSection>
          ) : null}
          {trips.map((entry, index) => (
            <FormSection key={entry.id} first={index === 0 && !spend}>
              <TripRow entry={entry} buyerEmoji={members.find((m) => m.userRecordName === entry.trip.buyerKey)} onEditTotal={() => editTotal(entry)}
                onUndo={(rec) => runtime.list(household.id).undoPurchase(rec)} />
            </FormSection>
          ))}
          {period === 'latest' && all.length > LATEST_COUNT ? (
            <FormSection><View style={s.more}><TextButton title={t('Show more trips')} onPress={() => setPeriod('week')} /></View></FormSection>
          ) : null}
        </>
      )}

      {editing ? <TripTotalSheet target={editing} household={household} onSkip={() => {}} onClose={() => setEditing(null)} /> : null}
    </ScrollView>
  );
}

function TripRow({ entry, buyerEmoji: buyer, onEditTotal, onUndo }: {
  entry: ActivityTrip; buyerEmoji: { emoji: string; colorHex: string } | undefined; onEditTotal: () => void; onUndo: (r: ActivityTrip['records'][number]) => void;
}) {
  const th = useTheme();
  const [open, setOpen] = useState(false);
  const end = entry.trip.end;
  const now = new Date();
  const sameDay = (a: Date, b: Date) => a.toDateString() === b.toDateString();
  const yesterday = new Date(now.getTime() - 86_400_000);
  const time = end.toLocaleTimeString(locale(), { hour: 'numeric', minute: '2-digit' });
  const day = sameDay(end, now) ? t('Today') : sameDay(end, yesterday) ? t('Yesterday') : end.toLocaleDateString(locale(), { weekday: 'short', day: 'numeric', month: 'short' });
  const count = tn('{n} item', '{n} items', entry.records.length);
  const subtitle = [`${day}, ${time}`, count, entry.total?.storeName].filter(Boolean).join(' · ');

  return (
    <View>
      <Pressable onPress={() => setOpen(!open)} style={s.head} accessibilityRole="button" accessibilityState={{ expanded: open }}>
        <MemberBadge emoji={buyer?.emoji} colorHex={buyer?.colorHex} size={38} />
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={{ fontSize: 15, fontWeight: '600', color: th.label }}>{entry.trip.buyerName}</Text>
          <Text style={{ fontSize: 12, color: th.secondaryLabel }}>{subtitle}</Text>
        </View>
        <Pressable onPress={onEditTotal} hitSlop={8} accessibilityLabel={entry.total ? t('Edit total, {amount}', { amount: formatCurrency(entry.total.amount, entry.total.currencyCode) }) : t('Add total')}>
          <Text style={{ fontSize: entry.total ? 15 : 12, fontWeight: '600', color: entry.total ? th.label : th.accent }}>
            {entry.total ? formatCurrency(entry.total.amount, entry.total.currencyCode) : t('Add total')}
          </Text>
        </Pressable>
        <Glyph name={open ? 'chevron.down' : 'chevron.right'} size={15} weight="bold" color={th.label} />
      </Pressable>
      {open ? entry.records.map((r) => (
        <SwipeRow key={r.id} trailing={[{ label: t('Undo'), icon: 'arrow.uturn.backward', color: th.red, onPress: () => onUndo(r) }]}>
          <View style={[s.line, { backgroundColor: th.cell, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: th.separator }]}>
            <Text style={{ fontSize: 15, color: th.label, flex: 1 }}>{purchaseItemName(r)}</Text>
            {purchaseQuantityText(r) ? <Text style={{ fontSize: 15, color: th.secondaryLabel }}>{purchaseQuantityText(r)}</Text> : null}
          </View>
        </SwipeRow>
      )) : null}
    </View>
  );
}

const s = StyleSheet.create({
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 40 },
  spend: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12 },
  head: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 15 },
  line: { flexDirection: 'row', paddingRight: 20, paddingVertical: 12, paddingLeft: 70 },
  more: { alignItems: 'flex-start', paddingHorizontal: 20, paddingVertical: 14 },
});
