import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useAccount, useAppState, useStoreVersion } from '../runtime/RuntimeProvider';

/** Temporary status screen until the real screens land: proves sign-in state and sync are wired. */
export default function Index() {
  const runtime = useAppState();
  const account = useAccount();
  useStoreVersion();
  if (!runtime.ready) return <View style={s.c}><ActivityIndicator /></View>;
  return (
    <View style={s.c}>
      <Text style={s.t}>Shopzyy</Text>
      <Text>phase: {account.phase}</Text>
      <Text>households: {runtime.store.allHouseholds().length}</Text>
      <Text>sync: {runtime.syncStatus.state}</Text>
    </View>
  );
}

const s = StyleSheet.create({ c: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 }, t: { fontSize: 28, fontWeight: '700' } });
