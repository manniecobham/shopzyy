import { Glyph, type SymbolName } from '../../components/Glyph';
import { t } from '../../i18n';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { ActionMenu } from '../../components/Sheet';
import { Prompt } from '../../components/Prompt';
import { useAccount, useAppState, useStoreVersion } from '../../runtime/RuntimeProvider';
import { useTheme } from '../../theme/theme';
import { HouseholdThumbnail, householdDisplayName } from './HouseholdBackground';

export function HouseholdSwitcher() {
  const th = useTheme();
  const runtime = useAppState();
  const account = useAccount();
  useStoreVersion();
  const [menu, setMenu] = useState(false);
  const [naming, setNaming] = useState(false);
  const households = runtime.store.allHouseholds();
  const current = runtime.currentHousehold;

  const create = (name: string) => {
    setNaming(false);
    if (!account.userRecordName || !account.profile) return;
    runtime.selectHousehold(runtime.households.create(name, account.userRecordName, account.profile).id);
  };

  return (
    <View>
      <Pressable onPress={() => setMenu(true)} accessibilityLabel={t('Switch household')} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: 270 }}>
        {current ? <HouseholdThumbnail household={current} /> : null}
        <Text numberOfLines={1} style={{ fontSize: 17, fontWeight: '600', color: th.label, flexShrink: 1 }}>{current ? householdDisplayName(current) : t('Household')}</Text>
        <Glyph name="chevron.down" size={13} color={th.label} />
      </Pressable>
      <ActionMenu visible={menu} title={t('Household')} onClose={() => setMenu(false)} sections={[
        households.map((h) => ({ title: householdDisplayName(h), checked: h.id === current?.id, onPress: () => runtime.selectHousehold(h.id) })),
        [{ title: t('New household…'), icon: 'plus', onPress: () => setNaming(true) }],
      ]} />
      <Prompt visible={naming} title={t('New household')} message={t('You can invite people to it from the Household tab.')}
        placeholder={t('e.g. Beach house')} confirmTitle={t('Create')} onConfirm={create} onCancel={() => setNaming(false)} />
    </View>
  );
}
