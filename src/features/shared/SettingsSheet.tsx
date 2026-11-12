import { Glyph, type SymbolName } from '../../components/Glyph';
import Constants from 'expo-constants';
import { useEffect, useState } from 'react';
import { Alert, Linking, Platform, Switch, Text, TextInput, View } from 'react-native';
import { LANGUAGES, LANGUAGE_NAMES, hasSystemAppLanguage, language, setLanguageOverride, t, tn, type Language } from '../../i18n';
import { LoadingOverlay } from '../../components/LogoAnimation';
import { Sheet } from '../../components/Sheet';
import { FormRow, FormSection, MemberBadge, ProminentButton } from '../../components/ui';
import { DELETE_CANCELLED } from '../../runtime/AppRuntime';
import { useAccount, useAppState } from '../../runtime/RuntimeProvider';
import { ShoppingListService } from '../../services/ShoppingListService';
import { StorageKeys } from '../../services/storageKeys';
import { HAD_LEGACY_APP_KEY } from '../../migration/legacyDefaults';
import { isDemo } from '../../demo/demo';
import { Brand, useTheme } from '../../theme/theme';
import { DiagnosticsSheet } from './DiagnosticsSheet';
import { EditProfileSheet } from './EditProfileSheet';

export function SettingsSheet({ onClose }: { onClose: () => void }) {
  const th = useTheme();
  const runtime = useAppState();
  const account = useAccount();
  const { prefs } = runtime;
  const [purchases, setPurchases] = useState(prefs.getBool(StorageKeys.notifyPurchases, true));
  const [restock, setRestock] = useState(prefs.getBool(StorageKeys.notifyRestock, true));
  const [denied, setDenied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [diagnostics, setDiagnostics] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [askingPassword, setAskingPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [importing, setImporting] = useState(false);
  const [picking, setPicking] = useState(false);
  const [, setLangTick] = useState(0);

  // The person can change this in system Settings and come back.
  useEffect(() => { void runtime.notifications.permissionDenied().then(setDenied); }, [runtime]);

  const toggle = (key: string, set: (v: boolean) => void) => (value: boolean) => {
    set(value);
    prefs.setBool(key, value);
    if (key === StorageKeys.notifyRestock) ShoppingListService.refreshRestockReminders(runtime.env);
    if (key === StorageKeys.notifyPurchases) void runtime.push.updateAlerts();
  };

  const runDelete = async (confirmPassword?: string) => {
    setDeleting(true);
    const error = await runtime.deleteMyData(confirmPassword);
    setDeleting(false);
    if (error === DELETE_CANCELLED) return;
    if (error) Alert.alert(t("Couldn't delete everything"), error);
    else onClose();
  };

  const confirmDelete = () => Alert.alert(
    t('Delete all your Shopzyy data?'),
    t("Households you created are deleted for everyone in them. You'll leave households others invited you to. Your account and profile are removed. This can't be undone."),
    [{ text: t('Cancel'), style: 'cancel' }, {
      text: t('Delete my data'), style: 'destructive',
      onPress: () => {
        if (runtime.account.provider === 'password') { setPassword(''); setAskingPassword(true); } else void runDelete();
      },
    }],
  );

  const importFromOldApp = () => Alert.alert(
    t('Import from the old Shopzy app?'),
    appEnv === 'production'
      ? t('This looks for households and lists the original Shopzy app left on this phone and adds anything missing to your account. Nothing is changed or deleted on the phone or in iCloud, and nothing already in your account is overwritten.')
      : t('This looks for households and lists the original Shopzy app left on this phone and adds anything missing to your {env} account. Nothing is changed or deleted on the phone or in iCloud, and nothing already in your account is overwritten.', { env: appEnv }),
    [{ text: t('Cancel'), style: 'cancel' }, {
      text: t('Import'),
      onPress: async () => {
        setImporting(true);
        const result = await runtime.importFromOldApp();
        setImporting(false);
        if (!result) Alert.alert(t("Couldn't import"), t('Something went wrong. Settings → Diagnostics shows what happened.'));
        else if (result.state === 'done') Alert.alert(t('Import finished'), tn('Moved {n} household ({records} records) to your account.', 'Moved {n} households ({records} records) to your account.', result.households, { records: result.records }));
        else Alert.alert(t('Nothing to import'), result.reliable
          ? t("No data from the old app was found on this phone. It's only available on phones where the old app was installed before you updated.")
          : t("This version of the app can't read the old app's data."));
      },
    }],
  );

  const openLanguage = () => {
    if (!hasSystemAppLanguage) { setPicking(true); return; }
    if (Platform.OS === 'android') {
      Linking.sendIntent('android.settings.APP_LOCALE_SETTINGS', [{ key: 'android.provider.extra.APP_URI', value: 'package:com.manniedevteam.shopzyy' }])
        .catch(() => Linking.openSettings());
    } else {
      void Linking.openSettings();
    }
  };
  const chooseLanguage = (lang: Language | null) => { setLanguageOverride(lang); setPicking(false); setLangTick((n) => n + 1); };

  const sync = runtime.syncStatus;
  const syncTitle = { idle: t('Up to date'), syncing: t('Syncing…'), offline: t('Offline'), failed: t('Not syncing') }[sync.state];
  const syncIcon = ({ idle: 'checkmark.icloud', syncing: 'icloud', offline: 'wifi.slash', failed: 'exclamationmark.icloud' } as const)[sync.state];
  const syncColor = sync.state === 'idle' ? th.green : sync.state === 'syncing' ? th.secondaryLabel : th.orange;
  const version = Constants.expoConfig?.version ?? '1.0';
  const appEnv = (Constants.expoConfig?.extra?.appEnv as string | undefined) ?? 'development';
  const hadOldApp = Platform.OS === 'ios' && !isDemo && prefs.getString(HAD_LEGACY_APP_KEY) === '1';

  return (
    <Sheet visible title={t('Settings')} doneTitle={t('Done')} onCancel={onClose}>
      <FormSection header={t('Profile')} footer={t("Your account is your Shopzyy identity. Households you're in show the profile you set here.")}>
        <FormRow last onPress={() => setEditing(true)} disabled={!account.profile} style={{ gap: 12 }}>
          {account.profile ? <MemberBadge emoji={account.profile.emoji} colorHex={account.profile.colorHex} size={40} /> : null}
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 17, color: th.label }}>{account.profile?.name ?? t('Your profile')}</Text>
            <Text style={{ fontSize: 13, color: th.secondaryLabel }}>{t('Edit name, avatar and colour')}</Text>
          </View>
          <Glyph name="chevron.right" size={16} color={th.tertiaryLabel} />
        </FormRow>
      </FormSection>

      <FormSection header={t('Account')} footer={account.email ? t('Signed in as {email}.', { email: account.email }) : t('Signed in.')}>
        <FormRow last onPress={() => void account.signOut().then(onClose)}><Text style={{ fontSize: 17, color: th.accent }}>{t('Sign out')}</Text></FormRow>
      </FormSection>

      <FormSection header={t('Notifications')} footer={denied
        ? t("Notifications are turned off for Shopzyy, so these alerts won't arrive until you allow them.")
        : t("When someone goes shopping you get one summary of what they bought, once they're done. Restock reminders arrive at 9 AM on the day Shopzyy expects you to run out, with a button to add the item straight to the list.")}>
        <FormRow><Text style={{ flex: 1, fontSize: 17, color: th.label }}>{t('Shopping trip alerts')}</Text><Switch value={purchases} onValueChange={toggle(StorageKeys.notifyPurchases, setPurchases)} trackColor={{ true: th.green }} /></FormRow>
        <FormRow last={!denied}><Text style={{ flex: 1, fontSize: 17, color: th.label }}>{t('Restock reminders')}</Text><Switch value={restock} onValueChange={toggle(StorageKeys.notifyRestock, setRestock)} trackColor={{ true: th.green }} /></FormRow>
        {denied ? (
          <FormRow last onPress={() => void Linking.openSettings()}>
            <Glyph name="bell.badge" size={20} color={th.accent} style={{ marginRight: 12 }} />
            <Text style={{ fontSize: 17, color: th.accent }}>{t('Turn on notifications in Settings')}</Text>
          </FormRow>
        ) : null}
      </FormSection>

      <FormSection header={t('Language')} footer={t("Shopzyy follows your phone's language. You can change it for Shopzyy only in your phone's settings.")}>
        <FormRow last onPress={openLanguage}>
          <Text style={{ fontSize: 17, color: th.label, flex: 1 }}>{t('Language')}</Text>
          <Text style={{ fontSize: 17, color: th.secondaryLabel, marginRight: 6 }}>{LANGUAGE_NAMES[language()]}</Text>
          <Glyph name="chevron.right" size={16} color={th.tertiaryLabel} />
        </FormRow>
      </FormSection>

      <FormSection header={t('Permissions')} footer={t('Notifications, photos and camera are managed in your phone\'s settings.')}>
        <FormRow last onPress={() => void Linking.openSettings()}>
          <Glyph name="gearshape" size={20} color={th.accent} style={{ marginRight: 12 }} />
          <Text style={{ fontSize: 17, color: th.label, flex: 1 }}>{t('Permissions')}</Text>
          <Glyph name="chevron.right" size={16} color={th.tertiaryLabel} />
        </FormRow>
      </FormSection>

      <FormSection header={t('Sync')} footer={t("Lists sync through your account. The app works offline and catches up when you're back online.")}>
        <FormRow>
          <Text style={{ flex: 1, fontSize: 17, color: th.label }}>{t('Sync')}</Text>
          <Glyph name={syncIcon} size={18} color={syncColor} />
          <Text style={{ fontSize: 17, color: syncColor, marginLeft: 6 }}>{syncTitle}</Text>
        </FormRow>
        <FormRow last onPress={() => runtime.restartSync()} disabled={sync.state === 'syncing'}>
          <Glyph name="arrow.triangle.2.circlepath" size={20} color={th.accent} style={{ marginRight: 12 }} />
          <Text style={{ fontSize: 17, color: th.accent }}>{t('Sync now')}</Text>
        </FormRow>
      </FormSection>

      <FormSection header={t('Your data')} footer={t("Diagnostics shows problems the app ran into; they're sent anonymously to help fix them. Deleting your data removes households you created for everyone in them, leaves the ones you joined, and removes your account and profile.")}>
        {hadOldApp ? (
          <FormRow onPress={importFromOldApp}>
            <Glyph name="square.and.arrow.down" size={20} color={th.accent} style={{ marginRight: 12 }} />
            <Text style={{ fontSize: 17, color: th.label, flex: 1 }}>{t('Import from the old Shopzy app')}</Text>
            <Glyph name="chevron.right" size={16} color={th.tertiaryLabel} />
          </FormRow>
        ) : null}
        <FormRow onPress={() => setDiagnostics(true)}>
          <Glyph name="stethoscope" size={20} color={th.accent} style={{ marginRight: 12 }} />
          <Text style={{ fontSize: 17, color: th.label, flex: 1 }}>{t('Diagnostics')}</Text>
          <Glyph name="chevron.right" size={16} color={th.tertiaryLabel} />
        </FormRow>
        <FormRow last onPress={confirmDelete}><Text style={{ fontSize: 17, color: th.red }}>{t('Delete my data…')}</Text></FormRow>
      </FormSection>

      <View style={{ alignItems: 'center', gap: 4, marginTop: 24 }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: th.secondaryLabel }}>{t('{app} by {maker}', { app: Brand.appName, maker: Brand.maker })}</Text>
        <Text style={{ fontSize: 13, fontStyle: 'italic', color: th.secondaryLabel }}>{t(Brand.tagline)}</Text>
        <Text style={{ fontSize: 13, color: th.secondaryLabel }}>{t('Version {version}', { version })}</Text>
        {appEnv !== 'production' ? <Text style={{ fontSize: 13, fontWeight: '600', color: th.orange }}>{t('{env} build · test data only', { env: appEnv[0].toUpperCase() + appEnv.slice(1) })}</Text> : null}
      </View>

      {askingPassword ? (
        <Sheet visible title={t('Confirm your password')} cancelTitle={t('Cancel')} onCancel={() => setAskingPassword(false)}>
          <FormSection footer={t("For your security, enter your password to delete your account. This can't be undone.")}>
            <FormRow last>
              <TextInput value={password} onChangeText={setPassword} placeholder={t('Password')} placeholderTextColor={th.tertiaryLabel}
                secureTextEntry autoCapitalize="none" autoCorrect={false} style={{ flex: 1, fontSize: 17, color: th.label }} />
            </FormRow>
          </FormSection>
          <View style={{ paddingHorizontal: 20 }}>
            <ProminentButton title={t('Delete my data')} disabled={password.length === 0}
              onPress={() => { const value = password; setAskingPassword(false); setPassword(''); void runDelete(value); }} />
          </View>
        </Sheet>
      ) : null}

      {picking ? (
        <Sheet visible title={t('Language')} cancelTitle={t('Cancel')} onCancel={() => setPicking(false)}>
          <FormSection>
            <FormRow onPress={() => chooseLanguage(null)}><Text style={{ flex: 1, fontSize: 17, color: th.label }}>{t('System default')}</Text></FormRow>
            {LANGUAGES.map((lang, i) => (
              <FormRow key={lang} last={i === LANGUAGES.length - 1} onPress={() => chooseLanguage(lang)}>
                <Text style={{ flex: 1, fontSize: 17, color: th.label }}>{LANGUAGE_NAMES[lang]}</Text>
                {language() === lang ? <Glyph name="checkmark" size={18} color={th.accent} /> : null}
              </FormRow>
            ))}
          </FormSection>
        </Sheet>
      ) : null}
      {editing ? <EditProfileSheet onClose={() => setEditing(false)} /> : null}
      {diagnostics ? <DiagnosticsSheet onClose={() => setDiagnostics(false)} /> : null}
      <LoadingOverlay visible={deleting} message={t('Deleting your data…')} />
      <LoadingOverlay visible={importing} message={t('Updating your data…')} />
    </Sheet>
  );
}
