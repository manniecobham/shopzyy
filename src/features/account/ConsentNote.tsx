import { Linking, Text } from 'react-native';
import { t as tr } from '../../i18n';
import { LEGAL_URLS } from '../../lib/legal';
import { useTheme } from '../../theme/theme';

const TERMS = '\u0001';
const PRIVACY = '\u0002';

export function ConsentNote() {
  const t = useTheme();
  const link = (label: string, url: string) => (
    <Text key={url} accessibilityRole="link" onPress={() => void Linking.openURL(url)} style={{ color: t.accent, fontWeight: '600' }}>{label}</Text>
  );
  const parts = tr('By continuing you agree to our {terms} and {privacy}.', { terms: TERMS, privacy: PRIVACY }).split(/([\u0001\u0002])/);
  return (
    <Text style={{ marginTop: 28, marginHorizontal: 32, textAlign: 'center', fontSize: 13, lineHeight: 19, color: t.secondaryLabel }}>
      {parts.map((p, i) => (p === TERMS ? link(tr('Terms of use'), LEGAL_URLS.terms) : p === PRIVACY ? link(tr('Privacy policy'), LEGAL_URLS.privacy) : <Text key={i}>{p}</Text>))}
    </Text>
  );
}
