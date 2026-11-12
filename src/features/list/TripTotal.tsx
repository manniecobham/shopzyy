import { Glyph, type SymbolName } from '../../components/Glyph';
import { t as tr } from '../../i18n';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Sheet } from '../../components/Sheet';
import { FormRow, FormSection } from '../../components/ui';
import { currencySymbol, householdCurrency } from '../../lib/format';
import type { ShoppingTrip } from '../../logic/ShoppingTrip';
import type { Household, TripTotal } from '../../models/entities';
import { useAccount, useRuntime } from '../../runtime/RuntimeProvider';
import { useTheme } from '../../theme/theme';

export interface TripTotalTarget {
  tripKey: string;
  householdID: string;
  endedAt: Date;
  skipKey: string;
  summary: string | null;
  existing: TripTotal | null;
}

export const targetForTrip = (trip: ShoppingTrip, skipKey: string): TripTotalTarget => ({
  tripKey: trip.id, householdID: trip.householdID, endedAt: trip.end, skipKey, summary: trip.body(), existing: null,
});
export const targetForTotal = (total: TripTotal): TripTotalTarget => ({
  tripKey: total.tripKey, householdID: total.householdID, endedAt: total.tripEndedAt, skipKey: total.tripKey, summary: null, existing: total,
});

export function TripTotalBanner({ onAdd, onSkip }: { onAdd: () => void; onSkip: () => void }) {
  const t = useTheme();
  return (
    <View style={[s.banner, { backgroundColor: t.isDark ? 'rgba(44,44,46,0.95)' : 'rgba(255,255,255,0.95)' }]}>
      <Glyph name="cart.badge.questionmark" size={20} color={t.accent} />
      <Text style={{ fontSize: 15, fontWeight: '600', color: t.label, flex: 1 }}>{tr('Done shopping?')}</Text>
      <Pressable onPress={onAdd} style={[s.add, { backgroundColor: t.accent }]}><Text style={{ fontSize: 15, fontWeight: '600', color: '#fff' }}>{tr('Add total')}</Text></Pressable>
      <Pressable onPress={onSkip} accessibilityLabel={tr('Skip')} hitSlop={8}><Glyph name="xmark" size={16} color={t.secondaryLabel} /></Pressable>
    </View>
  );
}

export function TripTotalSheet({ target, household, onSkip, onClose }: {
  target: TripTotalTarget; household: Household; onSkip: () => void; onClose: () => void;
}) {
  const t = useTheme();
  const runtime = useRuntime();
  const account = useAccount();
  const [amount, setAmount] = useState(target.existing ? String(target.existing.amount) : '');
  const [store, setStore] = useState(target.existing?.storeName ?? '');
  const value = Number(amount.replace(',', '.'));
  // An existing total keeps the currency it was paid in.
  const currency = target.existing?.currencyCode ?? householdCurrency(household.currencyCode);

  const save = () => {
    if (!(value > 0)) return;
    runtime.households.saveTripTotal({
      tripKey: target.tripKey, householdID: target.householdID, endedAt: target.endedAt, amount: value,
      currencyCode: currency, storeName: store, by: account.userRecordName,
    });
    onClose();
  };

  return (
    <Sheet visible title={target.existing ? tr('Edit total') : tr('Shopping total')} cancelTitle={target.existing ? tr('Cancel') : tr('Skip')}
      onCancel={() => { if (!target.existing) onSkip(); onClose(); }} onSave={save} saveDisabled={!(value > 0)}>
      <FormSection header={tr('How much was this shop?')} footer={`${target.summary ? `${target.summary}\n` : ''}${tr('Amounts are in {currency}. Change the currency in Household settings.', { currency })}`}>
        <FormRow style={{ gap: 8 }}>
          <Text style={{ fontSize: 22, color: t.secondaryLabel }}>{currencySymbol(currency)}</Text>
          <TextInput autoFocus value={amount} onChangeText={setAmount} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={t.tertiaryLabel}
            style={{ flex: 1, fontSize: 22, fontWeight: '600', color: t.label }} />
        </FormRow>
        <FormRow last><TextInput value={store} onChangeText={setStore} placeholder={tr('Store (optional)')} placeholderTextColor={t.tertiaryLabel} style={{ flex: 1, fontSize: 17, color: t.label }} /></FormRow>
      </FormSection>
    </Sheet>
  );
}

const s = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, marginBottom: 8, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  add: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
});
