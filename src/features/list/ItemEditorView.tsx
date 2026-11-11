import { Glyph, type SymbolName } from '../../components/Glyph';
import { useState } from 'react';
import { Text, TextInput, View } from 'react-native';
import { Prompt } from '../../components/Prompt';
import { PickerRow, Sheet } from '../../components/Sheet';
import { FormRow, FormSection } from '../../components/ui';
import { DayPhrase } from '../../logic/DayPhrase';
import { SuggestionEngine } from '../../logic/SuggestionEngine';
import { builtIn, categoryChoiceLabel, custom, roomChoiceLabel, sameChoice, type CategoryChoice, type RoomChoice } from '../../models/choices';
import { HOUSE_ROOMS, ITEM_CATEGORIES, MEASUREMENT_UNITS, categoryTitle, roomTitle, unitLabel, type MeasurementUnit } from '../../models/enums';
import type { GroceryItem } from '../../models/entities';
import {
  getCategoryChoice, getRecipient, getRoomChoice, itemHistory, itemUnit, lastPurchase, plainQty, purchaseCount, type ItemRecipient,
} from '../../models/itemOps';
import { relativeTime } from '../../lib/format';
import { useRuntime, useStoreVersion } from '../../runtime/RuntimeProvider';
import { useTheme } from '../../theme/theme';

type RecipientPick = 'nobody' | 'someoneElse' | `member:${string}`;

/** Edits a list item. Changes are drafted locally and committed on Save, so cancelling never leaves half-edited state behind. */
export function ItemEditorView({ item, householdID, onClose }: { item: GroceryItem; householdID: string; onClose: () => void }) {
  const t = useTheme();
  const runtime = useRuntime();
  useStoreVersion();
  const list = runtime.list(householdID);
  const members = runtime.store.membersOf(householdID).sort((a, b) => a.name.localeCompare(b.name));
  const options = runtime.store.optionsOf(householdID);

  const initialRecipient = getRecipient(item);
  const [name, setName] = useState(item.name);
  const [quantity, setQuantity] = useState(plainQty(item.quantity));
  const [unit, setUnit] = useState<MeasurementUnit | null>(itemUnit(item));
  const [category, setCategory] = useState<CategoryChoice>(getCategoryChoice(item));
  const [room, setRoom] = useState<RoomChoice | null>(getRoomChoice(item));
  const [note, setNote] = useState(item.note ?? '');
  const [assigneeID, setAssigneeID] = useState<string | null>(item.assignedTo?.id ?? null);
  const [pick, setPick] = useState<RecipientPick>(initialRecipient?.kind === 'member' ? `member:${initialRecipient.member.id}` : initialRecipient ? 'someoneElse' : 'nobody');
  const [recipientName, setRecipientName] = useState(initialRecipient?.kind === 'named' ? initialRecipient.name : '');
  const [newKind, setNewKind] = useState<'category' | 'room' | null>(null);

  const byTitle = <T extends { title: string }>(xs: T[]) => xs.sort((a, b) => a.title.localeCompare(b.title, undefined, { numeric: true }));
  const categoryChoices = byTitle<{ title: string; value: CategoryChoice }>([
    ...ITEM_CATEGORIES.map((c) => ({ title: categoryChoiceLabel(builtIn(c)), value: builtIn<typeof c>(c) as CategoryChoice, sort: categoryTitle(c) })),
    ...options.filter((o) => o.kindRaw === 'category').map((o) => ({ title: categoryChoiceLabel(custom(o)), value: custom<never>(o) as CategoryChoice, sort: o.name })),
  ].sort((a, b) => a.sort.localeCompare(b.sort, undefined, { numeric: true })).map(({ title, value }) => ({ title, value })));
  const roomChoices: { title: string; value: RoomChoice | null }[] = [
    { title: 'None', value: null },
    ...[
      ...HOUSE_ROOMS.map((r) => ({ title: roomChoiceLabel(builtIn(r)), value: builtIn<typeof r>(r) as RoomChoice, sort: roomTitle(r) })),
      ...options.filter((o) => o.kindRaw === 'room').map((o) => ({ title: roomChoiceLabel(custom(o)), value: custom<never>(o) as RoomChoice, sort: o.name })),
    ].sort((a, b) => a.sort.localeCompare(b.sort, undefined, { numeric: true })).map(({ title, value }) => ({ title, value })),
  ];

  const recipient = (): ItemRecipient | null => {
    if (pick === 'nobody') return null;
    if (pick === 'someoneElse') return recipientName.trim() === '' ? null : { kind: 'named', name: recipientName };
    const m = members.find((x) => `member:${x.id}` === pick);
    return m ? { kind: 'member', member: m } : null;
  };

  const save = () => {
    const q = Number(quantity.replace(',', '.'));
    list.update(item, {
      name, quantity: Number.isFinite(q) && q > 0 ? q : item.quantity, unit, category, room, note,
      assignedTo: members.find((m) => m.id === assigneeID) ?? null, recipient: recipient(),
    });
    onClose();
  };

  const addOption = (text: string) => {
    if (newKind === 'category') { const c = list.categoryChoiceNamed(text); if (c) setCategory(c); }
    if (newKind === 'room') { const r = list.roomChoiceNamed(text); if (r) setRoom(r); }
    setNewKind(null);
  };

  const pattern = new SuggestionEngine().pattern(itemHistory(item).purchaseDates);
  const input = { fontSize: 17, color: t.label, flex: 1, minHeight: 28 } as const;

  return (
    <Sheet visible title="Edit item" onCancel={onClose} onSave={save} saveDisabled={name.trim() === ''}>
      <FormSection><FormRow last><TextInput style={input} value={name} onChangeText={setName} placeholder="Name" placeholderTextColor={t.tertiaryLabel} /></FormRow></FormSection>

      <FormSection header="Amount">
        <FormRow last style={{ gap: 12 }}>
          <TextInput style={input} value={quantity} onChangeText={setQuantity} keyboardType="decimal-pad" placeholder="Quantity" placeholderTextColor={t.tertiaryLabel} />
          <UnitPicker unit={unit} onChange={setUnit} />
        </FormRow>
      </FormSection>

      <FormSection header="Who" footer="The assigned person is asked to buy it, but anyone can tick it off.">
        <PickerRow label="Assigned to" value={assigneeID} onChange={setAssigneeID}
          options={[{ title: 'Anyone', value: null }, ...members.map((m) => ({ title: `${m.emoji} ${m.name}`, value: m.id as string | null }))]} />
        <PickerRow label="For" value={pick} onChange={setPick} last={pick !== 'someoneElse'}
          options={[{ title: 'Everyone', value: 'nobody' as RecipientPick }, ...members.map((m) => ({ title: `${m.emoji} ${m.name}`, value: `member:${m.id}` as RecipientPick })), { title: 'Someone else…', value: 'someoneElse' as RecipientPick }]} />
        {pick === 'someoneElse' ? (
          <FormRow last><TextInput style={input} value={recipientName} onChangeText={setRecipientName} placeholder="e.g. the kids, Grandma" placeholderTextColor={t.tertiaryLabel} autoCapitalize="words" /></FormRow>
        ) : null}
      </FormSection>

      <FormSection footer={`Shopzyy remembers this the next time anyone adds ${item.name.toLowerCase()}.`}>
        <PickerRow label="Category" value={category} options={categoryChoices} onChange={setCategory} />
        <FormRow onPress={() => setNewKind('category')}><Glyph name="plus" size={20} color={t.accent} style={{ marginRight: 10 }} /><Text style={{ fontSize: 17, color: t.accent }}>New category…</Text></FormRow>
        <PickerRowChoice label="Room" value={room} options={roomChoices} onChange={setRoom} />
        <FormRow last onPress={() => setNewKind('room')}><Glyph name="plus" size={20} color={t.accent} style={{ marginRight: 10 }} /><Text style={{ fontSize: 17, color: t.accent }}>New room…</Text></FormRow>
      </FormSection>

      <FormSection header="Note">
        <FormRow last><TextInput style={[input, { minHeight: 44 }]} value={note} onChangeText={setNote} placeholder="e.g. the low-fat one" placeholderTextColor={t.tertiaryLabel} multiline /></FormRow>
      </FormSection>

      {pattern ? (
        <FormSection header="History">
          <Labeled label="Times bought" value={String(purchaseCount(item))} />
          <Labeled label="Last bought" value={relativeTime(pattern.lastPurchase)} last={pattern.expectedIntervalDays === null && !lastPurchase(item)?.member} />
          {pattern.expectedIntervalDays !== null ? <Labeled label="Usually bought" value={DayPhrase.cadence(Math.round(pattern.expectedIntervalDays))} last={!lastPurchase(item)?.member} /> : null}
          {lastPurchase(item)?.member ? <Labeled label="Last bought by" value={lastPurchase(item)!.member!.name} last /> : null}
        </FormSection>
      ) : null}

      <Prompt visible={newKind !== null} title={newKind === 'room' ? 'New room' : 'New category'} message="Everyone in the household can pick it for any item."
        placeholder={newKind === 'room' ? 'e.g. Guest room' : 'e.g. Party supplies'} confirmTitle="Add" onConfirm={addOption} onCancel={() => setNewKind(null)} />
    </Sheet>
  );
}

/** PickerRow compares with Object.is; room choices are objects, so match by identity of the choice. */
function PickerRowChoice({ label, value, options, onChange }: { label: string; value: RoomChoice | null; options: { title: string; value: RoomChoice | null }[]; onChange: (v: RoomChoice | null) => void }) {
  const current = options.find((o) => (o.value === null ? value === null : sameChoice(o.value, value))) ?? options[0];
  return <PickerRow label={label} value={current.value} options={options} onChange={onChange} />;
}

function UnitPicker({ unit, onChange }: { unit: MeasurementUnit | null; onChange: (u: MeasurementUnit | null) => void }) {
  return (
    <View style={{ width: 130 }}>
      <PickerRow hideLabel label="Unit" value={unit} onChange={onChange} last
        options={[{ title: 'Items', value: null as MeasurementUnit | null }, ...MEASUREMENT_UNITS.map((u) => ({ title: unitLabel(u), value: u as MeasurementUnit | null }))]} />
    </View>
  );
}

function Labeled({ label, value, last }: { label: string; value: string; last?: boolean }) {
  const t = useTheme();
  return <FormRow last={last}><Text style={{ fontSize: 17, color: t.label, flex: 1 }}>{label}</Text><Text style={{ fontSize: 17, color: t.secondaryLabel }}>{value}</Text></FormRow>;
}
