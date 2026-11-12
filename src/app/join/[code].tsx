import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { AppNotice } from '../../services/UserFacingError';
import { useAppState } from '../../runtime/RuntimeProvider';
import { t } from '../../i18n';

export default function JoinRoute() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const runtime = useAppState();
  const router = useRouter();

  useEffect(() => {
    if (!runtime.ready || !code) return;
    void runtime.handleInviteLink(String(code)).then((error) => {
      if (error) AppNotice.show(t("Couldn't join the household"), error);
      router.replace('/');
    });
  }, [runtime, runtime.ready, code, router]);

  return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator /></View>;
}
