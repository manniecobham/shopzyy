import { useState } from 'react';
import { Alert, Pressable } from 'react-native';
import { ActionMenu, Sheet } from '../../components/Sheet';
import { MemberBadge } from '../../components/ui';
import type { HouseholdMember } from '../../models/entities';
import { useAccount, useRuntime } from '../../runtime/RuntimeProvider';
import { ProfileFormView } from './ProfileFormView';
import { SettingsSheet } from './SettingsSheet';

/** The form for editing the person's own profile, in a sheet. */
export function EditProfileSheet({ onClose }: { onClose: () => void }) {
  const account = useAccount();
  const { households } = useRuntime();
  return (
    <Sheet visible title="Your profile" onCancel={onClose} scroll={false}>
      {account.profile ? (
        <ProfileFormView profile={account.profile} submitTitle="Save" onSubmit={(updated) => {
          account.saveProfile(updated);
          if (account.userRecordName) households.updateProfile(updated, account.userRecordName);
          onClose();
        }} />
      ) : null}
    </Sheet>
  );
}

/** The person's avatar in the header. Tapping it opens a menu to edit their profile, open settings or delete their data. */
export function ProfileMenu({ member }: { member: HouseholdMember | null }) {
  const account = useAccount();
  const runtime = useRuntime();
  const [menu, setMenu] = useState(false);
  const [editing, setEditing] = useState(false);
  const [settings, setSettings] = useState(false);

  const confirmDelete = () => Alert.alert(
    'Delete all your Shopzyy data?',
    "Households you created are deleted for everyone in them. You'll leave households others invited you to. Your account and profile are removed. This can't be undone.",
    [{ text: 'Cancel', style: 'cancel' }, {
      text: 'Delete my data', style: 'destructive',
      onPress: async () => { const error = await runtime.deleteMyData(); if (error) Alert.alert("Couldn't delete everything", error); },
    }],
  );

  return (
    <>
      <Pressable onPress={() => setMenu(true)} accessibilityLabel="Your profile">
        <MemberBadge emoji={member?.emoji ?? account.profile?.emoji} colorHex={member?.colorHex ?? account.profile?.colorHex} size={30} />
      </Pressable>
      <ActionMenu visible={menu} title={account.profile?.name ?? 'You'} onClose={() => setMenu(false)} sections={[[
        { title: 'Edit profile', icon: 'person-circle-outline', onPress: () => setEditing(true) },
        { title: 'Settings', icon: 'settings-outline', onPress: () => setSettings(true) },
        { title: 'Delete my data…', icon: 'trash-outline', destructive: true, onPress: confirmDelete },
      ]]} />
      {editing ? <EditProfileSheet onClose={() => setEditing(false)} /> : null}
      {settings ? <SettingsSheet onClose={() => setSettings(false)} /> : null}
    </>
  );
}
