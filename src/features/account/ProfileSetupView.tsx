import { getAuth } from '@react-native-firebase/auth';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from 'react-native';
import { suggestedProfile } from '../../models/factories';
import { useAccount, useRuntime, useStoreVersion } from '../../runtime/RuntimeProvider';
import { useTheme } from '../../theme/theme';
import { ProfileFormView } from '../shared/ProfileFormView';
import { t as tr } from '../../i18n';

export function ProfileSetupView() {
  const t = useTheme();
  const account = useAccount();
  const { store, households } = useRuntime();
  useStoreVersion();

  const mine = account.userRecordName ? store.allMembers().find((m) => m.userRecordName === account.userRecordName) : undefined;
  const starting = mine
    ? { name: mine.name, emoji: mine.emoji, colorHex: mine.colorHex }
    : suggestedProfile(account.suggestedName ?? getAuth().currentUser?.displayName?.split(' ')[0] ?? '');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.groupedBackground }}>
      <Text style={{ fontSize: 34, fontWeight: '700', color: t.label, paddingHorizontal: 20, paddingTop: 12 }}>{tr('Your profile')}</Text>
      <View style={{ flex: 1 }}>
        <ProfileFormView key={mine?.id ?? 'new'} profile={starting} submitTitle={tr('Continue')} onSubmit={(profile) => {
          account.saveProfile(profile);
          if (account.userRecordName) households.updateProfile(profile, account.userRecordName);
        }} />
      </View>
    </SafeAreaView>
  );
}
