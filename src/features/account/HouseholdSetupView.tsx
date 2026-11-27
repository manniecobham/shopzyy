import { useState } from 'react';
import { useJoinHousehold } from '../household/useJoinHousehold';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LoadingOverlay } from '../../components/LogoAnimation';
import { FormRow, FormSection, TextButton } from '../../components/ui';
import { useAccount, useRuntime } from '../../runtime/RuntimeProvider';
import { useTheme } from '../../theme/theme';
import { t as tr } from '../../i18n';

export function HouseholdSetupView() {
  const t = useTheme();
  const account = useAccount();
  const runtime = useRuntime();
  const [name, setName] = useState('');
  const join = useJoinHousehold();

  const create = () => {
    if (!account.userRecordName || !account.profile) return;
    const household = runtime.households.create(name, account.userRecordName, account.profile);
    runtime.selectHousehold(household.id);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.groupedBackground }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 32 }}>
          <Text style={[s.title, { color: t.label }]}>{account.profile?.name ? tr('Hi, {name}', { name: account.profile.name }) : tr('Hi there')}</Text>

          <FormSection header={tr('Start a household')} footer={tr("You can invite people from the Household tab once it's created.")}>
            <FormRow>
              <TextInput style={[s.input, { color: t.label }]} placeholder={tr('e.g. The Mensah home')} placeholderTextColor={t.tertiaryLabel}
                value={name} onChangeText={setName} returnKeyType="done" onSubmitEditing={create} maxLength={60} />
            </FormRow>
            <FormRow last onPress={create}><Text style={{ fontSize: 17, color: t.accent }}>{tr('Create household')}</Text></FormRow>
          </FormSection>

          <FormSection header={tr("Joining someone else's?")}
            footer={join.error ?? tr('Ask them for their invite code or link. Already in a household on another device? It appears here once it has synced.')}>
            <FormRow>
              <TextInput style={[s.input, { color: t.label, letterSpacing: 2 }]} placeholder={tr('Invite code')} placeholderTextColor={t.tertiaryLabel}
                value={join.code} onChangeText={join.setText} autoCapitalize="characters" autoCorrect={false}
                returnKeyType="join" onSubmitEditing={() => void join.join()} />
            </FormRow>
            {join.canPaste ? <FormRow><TextButton title={tr('Paste invite code')} onPress={() => void join.paste()} /></FormRow> : null}
            <FormRow last>
              <TextButton title={join.joining ? tr('Joining…') : tr('Join household')} onPress={() => void join.join()} disabled={join.joining || join.code.trim().length === 0} />
            </FormRow>
          </FormSection>
        </ScrollView>
      </KeyboardAvoidingView>
      <LoadingOverlay visible={join.joining || join.arriving} message={join.message} />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  title: { fontSize: 34, fontWeight: '700', paddingHorizontal: 20, paddingTop: 12 },
  input: { flex: 1, fontSize: 17, minHeight: 28 },
});
