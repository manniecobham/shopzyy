import { useMemo, useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { Glyph } from '../../components/Glyph';
import { Sheet } from '../../components/Sheet';
import { FormRow, FormSection } from '../../components/ui';
import { t as tr, tn } from '../../i18n';
import { currencySymbol, formatCurrency, householdCurrency } from '../../lib/format';
import { matchReceipt } from '../../logic/receiptMatch';
import type { ParsedReceipt } from '../../logic/receiptParser';
import type { GroceryItem, Household } from '../../models/entities';
import type { ReceiptEntry } from '../../services/receiptImport';
import { useTheme } from '../../theme/theme';

interface Row { include: boolean; itemID: string | null }

export function ReceiptReviewSheet({ receipt, household, listItems, onConfirm, onCancel }: {
  receipt: ParsedReceipt; household: Household; listItems: GroceryItem[];
  onConfirm: (a: { entries: ReceiptEntry[]; total: number; storeName: string | null; currencyCode: string }) => void; onCancel: () => void;
}) {
  const t = useTheme();
  const currency = householdCurrency(household.currencyCode);
  const [total, setTotal] = useState(receipt.total !== null ? String(receipt.total) : '');
  const [store, setStore] = useState(receipt.storeName ?? '');
  const [open, setOpen] = useState<number | null>(null);
  const [rows, setRows] = useState<Row[]>(() => matchReceipt(receipt.items, listItems).map((m) => ({ include: true, itemID: m.itemID })));

  const byID = useMemo(() => new Map(listItems.map((i) => [i.id, i])), [listItems]);
  const value = Number(total.replace(',', '.'));
  const used = new Set(rows.filter((r) => r.include && r.itemID).map((r) => r.itemID));
  const staying = listItems.filter((i) => !used.has(i.id));
  const included = rows.filter((r) => r.include).length;

  const patch = (i: number, p: Partial<Row>) => setRows((all) => all.map((r, j) => (j === i ? { ...r, ...p } : r)));

  const confirm = () => {
    const entries = receipt.items.flatMap((line, i) => (rows[i].include
      ? [{ name: line.name, quantity: line.quantity, item: rows[i].itemID ? byID.get(rows[i].itemID!) ?? null : null }] : []));
    onConfirm({ entries, total: value, storeName: store.trim() || null, currencyCode: currency });
  };

  return (
    <Sheet visible title={tr('Review receipt')} saveTitle={tr('Confirm')} onCancel={onCancel} onSave={confirm} saveDisabled={!(value > 0) || included === 0}>
      <FormSection header={tr('Total')} footer={tr('The photo was read on this device and has been deleted. Only what you confirm here is saved.')}>
        <FormRow style={{ gap: 8 }}>
          <Text style={{ fontSize: 22, color: t.secondaryLabel }}>{currencySymbol(currency)}</Text>
          <TextInput value={total} onChangeText={setTotal} keyboardType="decimal-pad" placeholder="0.00" placeholderTextColor={t.tertiaryLabel}
            style={{ flex: 1, fontSize: 22, fontWeight: '600', color: t.label }} />
        </FormRow>
        <FormRow last><TextInput value={store} onChangeText={setStore} placeholder={tr('Store (optional)')} placeholderTextColor={t.tertiaryLabel} style={{ flex: 1, fontSize: 17, color: t.label }} /></FormRow>
      </FormSection>

      {receipt.items.length > 0 ? (
        <FormSection header={tn('{n} item on the receipt', '{n} items on the receipt', receipt.items.length)} footer={tr('Tap an item to change which list item it matches.')}>
          {receipt.items.map((line, i) => {
            const row = rows[i];
            const matched = row.itemID ? byID.get(row.itemID) : undefined;
            const last = i === receipt.items.length - 1;
            return (
              <View key={`${line.name}-${i}`}>
                <FormRow last={last && open !== i} style={{ gap: 12, opacity: row.include ? 1 : 0.45 }}>
                  <Pressable hitSlop={8} onPress={() => patch(i, { include: !row.include })} accessibilityRole="checkbox" accessibilityState={{ checked: row.include }}>
                    <Glyph name={row.include ? 'checkmark.circle.fill' : 'circle'} size={24} color={row.include ? t.accent : t.tertiaryLabel} />
                  </Pressable>
                  <Pressable style={{ flex: 1 }} onPress={() => setOpen(open === i ? null : i)}>
                    <Text style={{ fontSize: 17, color: t.label }}>{line.quantity > 1 ? `${line.quantity} × ${line.name}` : line.name}</Text>
                    <Text style={{ fontSize: 13, color: matched ? t.accent : t.secondaryLabel }}>
                      {matched ? tr('Ticks off {name}', { name: matched.name }) : tr('Not on your list · added as new')}
                    </Text>
                  </Pressable>
                  {line.price !== null ? <Text style={{ fontSize: 17, color: t.secondaryLabel }}>{formatCurrency(line.price, currency)}</Text> : null}
                </FormRow>
                {open === i ? (
                  <View style={{ backgroundColor: t.fill }}>
                    <FormRow onPress={() => { patch(i, { itemID: null }); setOpen(null); }}>
                      <Text style={{ flex: 1, fontSize: 16, color: t.label }}>{tr('Not on your list · added as new')}</Text>
                      {!row.itemID ? <Glyph name="checkmark" size={16} /> : null}
                    </FormRow>
                    {listItems.filter((c) => c.id === row.itemID || !used.has(c.id)).map((c, k, arr) => (
                      <FormRow key={c.id} last={k === arr.length - 1} onPress={() => { patch(i, { itemID: c.id }); setOpen(null); }}>
                        <Text style={{ flex: 1, fontSize: 16, color: t.label }}>{c.name}</Text>
                        {c.id === row.itemID ? <Glyph name="checkmark" size={16} /> : null}
                      </FormRow>
                    ))}
                  </View>
                ) : null}
              </View>
            );
          })}
        </FormSection>
      ) : null}

      {staying.length > 0 ? (
        <FormSection header={tr('Stays on your list')}>
          <FormRow last><Text style={{ flex: 1, fontSize: 16, color: t.secondaryLabel }}>{staying.map((i) => i.name).join(', ')}</Text></FormRow>
        </FormSection>
      ) : null}
    </Sheet>
  );
}
