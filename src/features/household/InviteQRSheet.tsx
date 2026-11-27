import { StyleSheet, Text, View } from 'react-native';
import { QRCode } from '../../components/QRCode';
import { Sheet } from '../../components/Sheet';
import { useTheme } from '../../theme/theme';
import { t as tr } from '../../i18n';

export function InviteQRSheet({ name, code, link, onClose }: { name: string; code: string; link: string; onClose: () => void }) {
  const th = useTheme();
  return (
    <Sheet visible title={tr('Show QR code')} doneTitle={tr('Done')} onCancel={onClose}>
      <View style={s.body}>
        <Text style={[s.title, { color: th.label }]}>{tr('Scan to join {name}', { name })}</Text>
        <View accessible accessibilityLabel={tr('Scan to join {name}', { name })}><QRCode value={link} size={260} /></View>
        <Text style={[s.hint, { color: th.secondaryLabel }]}>{tr("Point a phone's camera at this code to join. It works for 7 days.")}</Text>
        <Text style={[s.or, { color: th.secondaryLabel }]}>{tr('Or enter this code in Shopzyy:')}</Text>
        <Text selectable style={[s.code, { color: th.label }]}>{code}</Text>
      </View>
    </Sheet>
  );
}

const s = StyleSheet.create({
  body: { alignItems: 'center', gap: 16, paddingHorizontal: 28, paddingTop: 24 },
  title: { fontSize: 22, fontWeight: '700', textAlign: 'center' },
  hint: { fontSize: 15, textAlign: 'center' },
  or: { fontSize: 15, marginTop: 8 },
  code: { fontSize: 32, fontWeight: '700', letterSpacing: 5 },
});
