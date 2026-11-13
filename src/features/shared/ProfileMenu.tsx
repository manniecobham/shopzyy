import { useState } from 'react';
import { t } from '../../i18n';
import { Alert } from 'react-native';
import { NativeMenu } from '../../components/NativeMenu';
import { MemberBadge } from '../../components/ui';
import type { HouseholdMember } from '../../models/entities';
import { useAccount, useRuntime } from '../../runtime/RuntimeProvider';
import { EditProfileSheet } from './EditProfileSheet';
import { SettingsSheet } from './SettingsSheet';

export function ProfileMenu({ member }: { member: HouseholdMember | null }) {
  const account = useAccount();
  const runtime = useRuntime();
  const [editing, setEditing] = useState(false);
  const [settings, setSettings] = useState(false);

  const confirmDelete = () => Alert.alert(
    t('Delete all your Shopzyy data?'),
    t("Households you created are deleted for everyone in them. You'll leave households others invited you to. Your account and profile are removed. This can't be undone."),
    [{ text: t('Cancel'), style: 'cancel' }, {
      text: t('Delete my data'), style: 'destructive',
      onPress: async () => { const error = await runtime.deleteMyData(); if (error) Alert.alert(t("Couldn't delete everything"), error); },
    }],
  );

  return (
    <>
      <NativeMenu label={t('Your profile')} sections={[[
        { title: t('Edit profile'), icon: 'person.crop.circle', onPress: () => setEditing(true) },
        { title: t('Settings'), icon: 'gearshape', onPress: () => setSettings(true) },
        { title: t('Delete my data…'), icon: 'trash', destructive: true, onPress: confirmDelete },
      ]]}>
        <MemberBadge emoji={member?.emoji ?? account.profile?.emoji} colorHex={member?.colorHex ?? account.profile?.colorHex} size={30} />
      </NativeMenu>
      {editing ? <EditProfileSheet onClose={() => setEditing(false)} /> : null}
      {settings ? <SettingsSheet onClose={() => setSettings(false)} /> : null}
    </>
  );
}
