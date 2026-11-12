import { Linking, StyleSheet, Text, View } from 'react-native';
import { t } from '../../i18n';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ProminentButton } from '../../components/ui';
import { useAppState } from '../../runtime/RuntimeProvider';
import { useTheme } from '../../theme/theme';

export function UpdateRequiredView() {
  const th = useTheme();
  const { appConfig } = useAppState();
  const url = appConfig.storeUrl;
  return (
    <SafeAreaView style={[s.root, { backgroundColor: th.background }]}>
      <View style={s.body}>
        <Text style={{ fontSize: 56 }}>🛒</Text>
        <Text style={[s.title, { color: th.label }]}>{t('Time to update')}</Text>
        <Text style={[s.sub, { color: th.secondaryLabel }]}>
          {appConfig.config.message ?? t('This version of Shopzyy is out of date. Update to the latest version to keep your lists in sync.')}
        </Text>
      </View>
      {url ? <View style={s.footer}><ProminentButton title={t('Update')} onPress={() => void Linking.openURL(url)} /></View> : null}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36, gap: 10 },
  title: { fontSize: 28, fontWeight: '700', textAlign: 'center' },
  sub: { fontSize: 16, textAlign: 'center' },
  footer: { paddingHorizontal: 24, paddingBottom: 20 },
});
