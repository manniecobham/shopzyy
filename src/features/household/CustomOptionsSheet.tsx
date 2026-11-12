import { Glyph, type SymbolName } from '../../components/Glyph';
import { t, tn } from '../../i18n';
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

export function CustomOptionsSheet({ householdID, onClose }: { householdID: string; onClose: () => void }) {
  const th = useTheme();
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
      <FormSection header={title} footer={kind === 'category' ? t('Items in a deleted category go back to their usual aisle.') : t('Items for a deleted room are kept, just without a room.')}>
        {matching.map((o) => {
          const count = runtime.store.itemCount(o);
          return (
            <SwipeRow key={o.id} trailing={[{ label: t('Delete'), icon: 'trash', color: th.red, onPress: () => list.deleteOption(o) }]}>
              <FormRow style={{ backgroundColor: th.cell }}>
                <Text style={{ flex: 1, fontSize: 17, color: th.label }}>{`${CUSTOM_EMOJI[kind]}  ${o.name}`}</Text>
                <Text style={{ fontSize: 13, color: th.secondaryLabel }}>{tn('{n} item', '{n} items', count)}</Text>
              </FormRow>
            </SwipeRow>
          );
        })}
        <FormRow last onPress={() => setAdding(kind)}>
          <Glyph name="plus" size={20} color={th.accent} style={{ marginRight: 10 }} />
          <Text style={{ fontSize: 17, color: th.accent }}>{addTitle}</Text>
        </FormRow>
      </FormSection>
    );
  };

  return (
    <Sheet visible title={t('Categories & rooms')} cancelTitle={t('Done')} onCancel={onClose}>
      {section('category', t('Categories'), t('Add category'))}
      {section('room', t('Rooms'), t('Add room'))}
      <Prompt visible={adding !== null} title={adding === 'room' ? t('New room') : t('New category')}
        placeholder={adding === 'room' ? t('e.g. Guest room') : t('e.g. Party supplies')} confirmTitle={t('Add')} onConfirm={add} onCancel={() => setAdding(null)} />
    </Sheet>
  );
}

export const confirmDelete = (title: string, message: string, onConfirm: () => void) =>
  Alert.alert(title, message, [{ text: t('Cancel'), style: 'cancel' }, { text: t('Delete'), style: 'destructive', onPress: onConfirm }]);
