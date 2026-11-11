import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FormRow, FormSection, ProminentButton, TextButton } from '../../components/ui';
import { useAccount } from '../../runtime/RuntimeProvider';
import { Brand, useTheme } from '../../theme/theme';

/**
 * Replaces the Swift app's "Turn on iCloud" step: Shopzyy has its own account now, so people
 * sign in with Apple (iPhone), Google or an email and password.
 */
export function SignInView() {
  const t = useTheme();
  const account = useAccount();
  const [mode, setMode] = useState<'signIn' | 'signUp'>('signIn');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const canSubmit = email.trim().includes('@') && password.length >= 6;

  const submit = () => {
    if (!canSubmit) return;
    void (mode === 'signIn' ? account.signInWithEmail(email, password) : account.signUpWithEmail(email, password));
  };

  const forgot = async () => {
    if (!email.trim().includes('@')) return Alert.alert('Enter your email first', 'Type the email you signed up with, then tap "Forgot password?" again.');
    if (await account.resetPassword(email)) Alert.alert('Check your email', 'We sent you a link to choose a new password.');
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.groupedBackground }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 32 }}>
          <View style={s.hero}>
            <Text style={{ fontSize: 48 }}>🛒</Text>
            <Text style={[s.title, { color: t.label }]}>Sign in to {Brand.appName}</Text>
            <Text style={[s.sub, { color: t.secondaryLabel }]}>Your account keeps your households in sync on every device.</Text>
          </View>

          <View style={{ paddingHorizontal: 16, gap: 10 }}>
            {Platform.OS === 'ios' ? (
              <Pressable accessibilityRole="button" disabled={account.busy} onPress={() => void account.signInWithApple()}
                style={[s.social, { backgroundColor: t.isDark ? '#fff' : '#000' }]}>
                <Ionicons name="logo-apple" size={22} color={t.isDark ? '#000' : '#fff'} />
                <Text style={[s.socialText, { color: t.isDark ? '#000' : '#fff' }]}>Continue with Apple</Text>
              </Pressable>
            ) : null}
            <Pressable accessibilityRole="button" disabled={account.busy} onPress={() => void account.signInWithGoogle()}
              style={[s.social, { backgroundColor: t.cell, borderWidth: StyleSheet.hairlineWidth, borderColor: t.separator }]}>
              <Ionicons name="logo-google" size={20} color={t.label} />
              <Text style={[s.socialText, { color: t.label }]}>Continue with Google</Text>
            </Pressable>
          </View>

          <FormSection header={mode === 'signIn' ? 'Or use your email' : 'Create an account'}>
            <FormRow>
              <TextInput style={[s.input, { color: t.label }]} placeholder="Email" placeholderTextColor={t.tertiaryLabel}
                value={email} onChangeText={setEmail} autoCapitalize="none" autoCorrect={false} keyboardType="email-address"
                textContentType="emailAddress" autoComplete="email" />
            </FormRow>
            <FormRow last>
              <TextInput style={[s.input, { color: t.label }]} placeholder="Password (6+ characters)" placeholderTextColor={t.tertiaryLabel}
                value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none"
                textContentType={mode === 'signIn' ? 'password' : 'newPassword'} onSubmitEditing={submit} returnKeyType="go" />
            </FormRow>
          </FormSection>

          {account.lastError ? <Text style={[s.error, { color: t.red }]} accessibilityLiveRegion="polite">{account.lastError}</Text> : null}

          <View style={{ marginHorizontal: 16, marginTop: 18 }}>
            <ProminentButton title={mode === 'signIn' ? 'Sign in' : 'Create account'} onPress={submit} disabled={!canSubmit} busy={account.busy} />
          </View>

          <View style={s.links}>
            <TextButton title={mode === 'signIn' ? 'Create an account' : 'I already have an account'} onPress={() => setMode(mode === 'signIn' ? 'signUp' : 'signIn')} />
            {mode === 'signIn' ? <TextButton title="Forgot password?" onPress={() => void forgot()} /> : null}
          </View>
          {account.busy ? <ActivityIndicator style={{ marginTop: 16 }} /> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  hero: { alignItems: 'center', gap: 8, paddingHorizontal: 32, paddingTop: 28, paddingBottom: 24 },
  title: { fontSize: 28, fontWeight: '700', textAlign: 'center' },
  sub: { fontSize: 16, textAlign: 'center' },
  social: { minHeight: 50, borderRadius: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  socialText: { fontSize: 17, fontWeight: '600' },
  input: { flex: 1, fontSize: 17, minHeight: 28 },
  error: { fontSize: 14, marginHorizontal: 32, marginTop: 12 },
  links: { marginTop: 22, alignItems: 'center', gap: 14 },
});
