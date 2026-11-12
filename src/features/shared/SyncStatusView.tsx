import { Glyph, type SymbolName } from '../../components/Glyph';
import { t } from '../../i18n';
import { Text, View } from 'react-native';
import { useAppState } from '../../runtime/RuntimeProvider';
import { useTheme } from '../../theme/theme';

export function SyncStatusView() {
  const th = useTheme();
  const { syncStatus } = useAppState();
  if (syncStatus.state === 'idle' || syncStatus.state === 'syncing') return null;
  const offline = syncStatus.state === 'offline';
  const detail = offline ? t("Your changes are saved on this phone and will sync when you're back online.") : syncStatus.message;
  return (
    <View style={{ marginHorizontal: 16, marginTop: 12, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, backgroundColor: th.cell, flexDirection: 'row', alignItems: 'center', gap: 8 }}
      accessible accessibilityHint={detail}>
      <Glyph name={offline ? 'wifi.slash' : 'exclamationmark.icloud'} size={16} color={th.orange} />
      <Text style={{ fontSize: 13, fontWeight: '600', color: th.label, flex: 1 }}>{offline ? t('Offline') : t('Not syncing')}</Text>
    </View>
  );
}
