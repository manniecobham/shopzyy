import { Glyph, type SymbolName } from '../../components/Glyph';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { ActionMenu } from '../../components/Sheet';
import { Prompt } from '../../components/Prompt';
import { useAccount, useRuntime, useStoreVersion } from '../../runtime/RuntimeProvider';
import { useTheme } from '../../theme/theme';
import { HouseholdThumbnail, householdDisplayName } from './HouseholdBackground';

/** Header control showing the current household, to switch between households or start a new one. */
export function HouseholdSwitcher() {
  const t = useTheme();
  const runtime = useRuntime();
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
      <Pressable onPress={() => setMenu(true)} accessibilityLabel="Switch household" style={{ flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: 180 }}>
        {current ? <HouseholdThumbnail household={current} /> : null}
        <Text numberOfLines={1} style={{ fontSize: 17, fontWeight: '600', color: t.label, flexShrink: 1 }}>{current ? householdDisplayName(current) : 'Household'}</Text>
        <Glyph name="chevron.down" size={13} color={t.label} />
      </Pressable>
      <ActionMenu visible={menu} title="Household" onClose={() => setMenu(false)} sections={[
        households.map((h) => ({ title: householdDisplayName(h), checked: h.id === current?.id, onPress: () => runtime.selectHousehold(h.id) })),
        [{ title: 'New household…', icon: 'plus', onPress: () => setNaming(true) }],
      ]} />
      <Prompt visible={naming} title="New household" message="You can invite people to it from the Household tab."
        placeholder="e.g. Beach house" confirmTitle="Create" onConfirm={create} onCancel={() => setNaming(false)} />
    </View>
  );
}
