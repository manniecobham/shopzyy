import { Linking, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ProminentButton } from '../../components/ui';
import { useAppState } from '../../runtime/RuntimeProvider';
import { useTheme } from '../../theme/theme';

/** Blocks the app when this build is older than the minimum version you set in `config/app`. */
export function UpdateRequiredView() {
  const t = useTheme();
  const { appConfig } = useAppState();
  const url = appConfig.storeUrl;
  return (
    <SafeAreaView style={[s.root, { backgroundColor: t.background }]}>
      <View style={s.body}>
        <Text style={{ fontSize: 56 }}>🛒</Text>
        <Text style={[s.title, { color: t.label }]}>Time to update</Text>
        <Text style={[s.sub, { color: t.secondaryLabel }]}>
          {appConfig.config.message ?? 'This version of Shopzyy is out of date. Update to the latest version to keep your lists in sync.'}
        </Text>
      </View>
      {url ? <View style={s.footer}><ProminentButton title="Update" onPress={() => void Linking.openURL(url)} /></View> : null}
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
