import { Glyph, type SymbolName } from '../../components/Glyph';
import { useState } from 'react';
import { Alert, Text } from 'react-native';
import { Prompt } from '../../components/Prompt';
import { Sheet } from '../../components/Sheet';
import { SwipeRow } from '../../components/SwipeRow';
import { FormRow, FormSection } from '../../components/ui';
import { CUSTOM_EMOJI } from '../../models/choices';
import type { OptionKind } from '../../models/entities';
import { useRuntime, useStoreVersion } from '../../runtime/RuntimeProvider';
import { useTheme } from '../../theme/theme';

/** Lists the household's own categories and rooms. Built-in ones are always available and aren't shown here. */
export function CustomOptionsSheet({ householdID, onClose }: { householdID: string; onClose: () => void }) {
  const t = useTheme();
  const runtime = useRuntime();
  useStoreVersion();
  const list = runtime.list(householdID);
  const [adding, setAdding] = useState<OptionKind | null>(null);
  const options = runtime.store.optionsOf(householdID).sort((a, b) => a.name.localeCompare(b.name));

  const add = (name: string) => {
    if (adding === 'category') list.categoryChoiceNamed(name);
    if (adding === 'room') list.roomChoiceNamed(name);
    setAdding(null);
  };

  const section = (kind: OptionKind, title: string, addTitle: string) => {
    const matching = options.filter((o) => o.kindRaw === kind);
    return (
      <FormSection header={title} footer={kind === 'category' ? 'Items in a deleted category go back to their usual aisle.' : 'Items for a deleted room are kept, just without a room.'}>
        {matching.map((o) => {
          const count = runtime.store.itemCount(o);
          return (
            <SwipeRow key={o.id} trailing={[{ label: 'Delete', icon: 'trash', color: t.red, onPress: () => list.deleteOption(o) }]}>
              <FormRow style={{ backgroundColor: t.cell }}>
                <Text style={{ flex: 1, fontSize: 17, color: t.label }}>{`${CUSTOM_EMOJI[kind]}  ${o.name}`}</Text>
                <Text style={{ fontSize: 13, color: t.secondaryLabel }}>{count === 1 ? '1 item' : `${count} items`}</Text>
              </FormRow>
            </SwipeRow>
          );
        })}
        <FormRow last onPress={() => setAdding(kind)}>
          <Glyph name="plus" size={20} color={t.accent} style={{ marginRight: 10 }} />
          <Text style={{ fontSize: 17, color: t.accent }}>{addTitle}</Text>
        </FormRow>
      </FormSection>
    );
  };

  return (
    <Sheet visible title="Categories & rooms" cancelTitle="Done" onCancel={onClose}>
      {section('category', 'Categories', 'Add category')}
      {section('room', 'Rooms', 'Add room')}
      <Prompt visible={adding !== null} title={adding === 'room' ? 'New room' : 'New category'}
        placeholder={adding === 'room' ? 'e.g. Guest room' : 'e.g. Party supplies'} confirmTitle="Add" onConfirm={add} onCancel={() => setAdding(null)} />
    </Sheet>
  );
}

export const confirmDelete = (title: string, message: string, onConfirm: () => void) =>
  Alert.alert(title, message, [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: onConfirm }]);
