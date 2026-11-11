import { Ionicons } from '@expo/vector-icons';
import { Text, View } from 'react-native';
import { useAppState } from '../../runtime/RuntimeProvider';
import { useTheme } from '../../theme/theme';

/**
 * A quiet notice when changes aren't reaching the server, so nobody wonders why the rest of
 * the household can't see what they just added. Shows nothing while sync is working normally.
 */
export function SyncStatusView() {
  const t = useTheme();
  const { syncStatus } = useAppState();
  if (syncStatus.state === 'idle' || syncStatus.state === 'syncing') return null;
  const offline = syncStatus.state === 'offline';
  const detail = offline ? "Your changes are saved on this phone and will sync when you're back online." : syncStatus.message;
  return (
    <View style={{ marginHorizontal: 16, marginTop: 12, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, backgroundColor: t.cell, flexDirection: 'row', alignItems: 'center', gap: 8 }}
      accessible accessibilityHint={detail}>
      <Ionicons name={offline ? 'cloud-offline-outline' : 'alert-circle-outline'} size={16} color={t.orange} />
      <Text style={{ fontSize: 13, fontWeight: '600', color: t.label, flex: 1 }}>{offline ? 'Offline' : 'Not syncing'}</Text>
    </View>
  );
}
