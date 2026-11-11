import { useState } from 'react';
import { Pressable } from 'react-native';
import { ActionMenu, Sheet } from '../../components/Sheet';
import { MemberBadge } from '../../components/ui';
import type { HouseholdMember } from '../../models/entities';
import { useAccount, useRuntime } from '../../runtime/RuntimeProvider';
import { ProfileFormView } from './ProfileFormView';

/** The person's avatar in the header. Tapping it opens a menu to edit their profile. */
export function ProfileMenu({ member }: { member: HouseholdMember | null }) {
  const account = useAccount();
  const { households } = useRuntime();
  const [menu, setMenu] = useState(false);
  const [editing, setEditing] = useState(false);

  return (
    <>
      <Pressable onPress={() => setMenu(true)} accessibilityLabel="Your profile">
        <MemberBadge emoji={member?.emoji ?? account.profile?.emoji} colorHex={member?.colorHex ?? account.profile?.colorHex} size={30} />
      </Pressable>
      <ActionMenu visible={menu} title={account.profile?.name ?? 'You'} onClose={() => setMenu(false)}
        sections={[[{ title: 'Edit profile', icon: 'person-circle-outline', onPress: () => setEditing(true) }]]} />
      <Sheet visible={editing} title="Your profile" onCancel={() => setEditing(false)} scroll={false}>
        {account.profile ? (
          <ProfileFormView profile={account.profile} submitTitle="Save" onSubmit={(updated) => {
            account.saveProfile(updated);
            if (account.userRecordName) households.updateProfile(updated, account.userRecordName);
            setEditing(false);
          }} />
        ) : null}
      </Sheet>
    </>
  );
}
