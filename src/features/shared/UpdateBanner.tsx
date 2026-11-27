import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { Glyph } from '../../components/Glyph';
import { t } from '../../i18n';
import { useAppState } from '../../runtime/RuntimeProvider';
import { useTheme } from '../../theme/theme';

export function UpdateBanner() {
  const th = useTheme();
  const { appConfig } = useAppState();
  if (!appConfig.updateNudgeVisible()) return null;
  return (
    <View style={[s.banner, { backgroundColor: th.isDark ? 'rgba(44,44,46,0.95)' : 'rgba(255,255,255,0.95)' }]}>
      <Glyph name="arrow.up.circle.fill" size={26} color={th.accent} />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 15, fontWeight: '600', color: th.label }}>{t('A new version of Shopzyy is available')}</Text>
        <Text style={{ fontSize: 13, color: th.secondaryLabel }}>{t('Update for the latest features and fixes.')}</Text>
      </View>
      <Pressable onPress={() => void Linking.openURL(appConfig.storeUrl)} style={[s.update, { backgroundColor: th.accent }]}>
        <Text style={{ fontSize: 15, fontWeight: '600', color: '#fff' }}>{t('Update')}</Text>
      </Pressable>
      <Pressable onPress={() => appConfig.dismissUpdateNudge()} accessibilityLabel={t('Later')} hitSlop={8}>
        <Glyph name="xmark" size={16} color={th.secondaryLabel} />
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'center', gap: 10, marginHorizontal: 16, marginTop: 12, padding: 12, borderRadius: 16 },
  update: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14 },
});
