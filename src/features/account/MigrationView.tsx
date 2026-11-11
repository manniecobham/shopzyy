import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LogoLoader } from '../../components/LogoAnimation';
import { ProminentButton, TextButton } from '../../components/ui';
import { useAccount, useAppState } from '../../runtime/RuntimeProvider';
import { useTheme } from '../../theme/theme';

/** Shown for a moment on the first launch after updating from the original app, while the person's lists move to their new account. */
export function MigrationView() {
  const t = useTheme();
  const runtime = useAppState();
  const account = useAccount();
  const { migration } = runtime;
  const failed = migration.state === 'failed';
  const p = migration.progress;

  return (
    <SafeAreaView style={[s.root, { backgroundColor: t.background }]}>
      <View style={s.body}>
        {failed ? <Text style={{ fontSize: 56 }}>🛒</Text> : <LogoLoader size={128} label="Moving your lists" />}
        <Text style={[s.title, { color: t.label }]}>{failed ? "Couldn't move your lists yet" : 'Moving your lists…'}</Text>
        <Text style={[s.sub, { color: t.secondaryLabel }]}>
          {failed
            ? migration.message
            : 'Shopzyy is bringing your households, lists and shopping history to your new account. Nothing on your phone or in iCloud is changed or deleted.'}
        </Text>
        {!failed && p && p.total > 0 ? <Text style={{ marginTop: 10, fontSize: 13, color: t.secondaryLabel }}>{Math.min(p.done, p.total)} of {p.total}</Text> : null}
      </View>
      {failed ? (
        <View style={s.footer}>
          <ProminentButton title="Try again" onPress={() => runtime.retryMigration()} />
          <TextButton title="Sign out" onPress={() => void account.signOut()} />
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 36, gap: 10 },
  title: { fontSize: 26, fontWeight: '700', textAlign: 'center' },
  sub: { fontSize: 16, textAlign: 'center' },
  footer: { paddingHorizontal: 24, paddingBottom: 20, gap: 16, alignItems: 'center' },
});
