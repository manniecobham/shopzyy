import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppLogo } from '../../components/AppLogo';
import { Icon, ProminentButton, type IconName } from '../../components/ui';
import { Brand, useTheme } from '../../theme/theme';
import { t as tr } from '../../i18n';

export function WelcomeView({ onStart }: { onStart: () => void }) {
  const t = useTheme();
  return (
    <SafeAreaView style={[s.root, { backgroundColor: t.background }]}>
      <ScrollView contentContainerStyle={s.scroll}>
        <View style={s.hero}>
          <AppLogo />
          <Text style={[s.title, { color: t.label }]}>{tr('Welcome to {app}', { app: Brand.appName })}</Text>
          <Text style={[s.tagline, { color: t.accent }]}>{Brand.tagline}</Text>
          <Text style={[s.body, { color: t.secondaryLabel }]}>
            {tr('A shared shopping list for your households. It learns what you buy and reminds everyone before you run out.')}
          </Text>
        </View>
        <View style={s.features}>
          <Feature icon="person.2" text={tr('Share a list with everyone at home')} />
          <Feature icon="sparkles" text={tr('Get reminded before things run out')} />
          <Feature icon="bell.badge" text={tr('Know when someone has been shopping')} />
        </View>
      </ScrollView>
      <View style={s.footer}>
        <ProminentButton title={tr('Get started')} onPress={onStart} />
        <Text style={[s.note, { color: t.secondaryLabel }]}>
          {tr('Your lists are stored securely and shared only with the households you join. Sign in with Apple, Google or your email.')}
        </Text>
      </View>
    </SafeAreaView>
  );
}

function Feature({ icon, text }: { icon: IconName; text: string }) {
  const t = useTheme();
  return (
    <View style={s.feature}>
      <View style={{ width: 28, alignItems: 'center' }}><Icon name={icon} size={22} /></View>
      <Text style={{ fontSize: 17, color: t.label, flex: 1 }}>{text}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingVertical: 24 },
  hero: { alignItems: 'center', gap: 12, paddingHorizontal: 32 },
  title: { fontSize: 34, fontWeight: '700', textAlign: 'center' },
  tagline: { fontSize: 17, fontWeight: '600', fontStyle: 'italic', textAlign: 'center' },
  body: { fontSize: 17, textAlign: 'center' },
  features: { marginTop: 36, paddingHorizontal: 40, gap: 18 },
  feature: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  footer: { paddingHorizontal: 24, paddingBottom: 16, gap: 12 },
  note: { fontSize: 13, textAlign: 'center' },
});
