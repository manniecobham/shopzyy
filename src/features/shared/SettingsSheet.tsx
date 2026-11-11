import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Switch, Text, View } from 'react-native';
import { Sheet } from '../../components/Sheet';
import { FormRow, FormSection, MemberBadge } from '../../components/ui';
import { useAccount, useAppState } from '../../runtime/RuntimeProvider';
import { ShoppingListService } from '../../services/ShoppingListService';
import { StorageKeys } from '../../services/storageKeys';
import { Brand, useTheme } from '../../theme/theme';
import { DiagnosticsSheet } from './DiagnosticsSheet';
import { EditProfileSheet } from './ProfileMenu';

/**
 * App-level settings: things that belong to this person and this device, as opposed to the
 * household's own settings (name, background, members), which stay on the Household tab.
 */
export function SettingsSheet({ onClose }: { onClose: () => void }) {
  const t = useTheme();
  const runtime = useAppState();
  const account = useAccount();
  const { prefs } = runtime;
  const [purchases, setPurchases] = useState(prefs.getBool(StorageKeys.notifyPurchases, true));
  const [restock, setRestock] = useState(prefs.getBool(StorageKeys.notifyRestock, true));
  const [denied, setDenied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [diagnostics, setDiagnostics] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // The person can change this in system Settings and come back.
  useEffect(() => { void runtime.notifications.permissionDenied().then(setDenied); }, [runtime]);

  const toggle = (key: string, set: (v: boolean) => void) => (value: boolean) => {
    set(value);
    prefs.setBool(key, value);
    if (key === StorageKeys.notifyRestock) ShoppingListService.refreshRestockReminders(runtime.env);
    if (key === StorageKeys.notifyPurchases) void runtime.push.updateAlerts();
  };

  const confirmDelete = () => Alert.alert(
    'Delete all your Shopzyy data?',
    "Households you created are deleted for everyone in them. You'll leave households others invited you to. Your account and profile are removed. This can't be undone.",
    [{ text: 'Cancel', style: 'cancel' }, {
      text: 'Delete my data', style: 'destructive',
      onPress: async () => {
        setDeleting(true);
        const error = await runtime.deleteMyData();
        setDeleting(false);
        if (error) Alert.alert("Couldn't delete everything", error);
        else onClose();
      },
    }],
  );

  const sync = runtime.syncStatus;
  const syncTitle = { idle: 'Up to date', syncing: 'Syncing…', offline: 'Offline', failed: 'Not syncing' }[sync.state];
  const syncIcon = ({ idle: 'cloud-done-outline', syncing: 'cloud-outline', offline: 'cloud-offline-outline', failed: 'alert-circle-outline' } as const)[sync.state];
  const syncColor = sync.state === 'idle' ? t.green : sync.state === 'syncing' ? t.secondaryLabel : t.orange;
  const version = Constants.expoConfig?.version ?? '1.0';

  return (
    <Sheet visible title="Settings" cancelTitle="Done" onCancel={onClose}>
      <FormSection header="Profile" footer="Your account is your Shopzyy identity. Households you're in show the profile you set here.">
        <FormRow last onPress={() => setEditing(true)} disabled={!account.profile} style={{ gap: 12 }}>
          {account.profile ? <MemberBadge emoji={account.profile.emoji} colorHex={account.profile.colorHex} size={40} /> : null}
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 17, color: t.label }}>{account.profile?.name ?? 'Your profile'}</Text>
            <Text style={{ fontSize: 13, color: t.secondaryLabel }}>Edit name, avatar and colour</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={t.tertiaryLabel} />
        </FormRow>
      </FormSection>

      <FormSection header="Account" footer={account.email ? `Signed in as ${account.email}.` : 'Signed in.'}>
        <FormRow last onPress={() => void account.signOut().then(onClose)}><Text style={{ fontSize: 17, color: t.accent }}>Sign out</Text></FormRow>
      </FormSection>

      <FormSection header="Notifications" footer={denied
        ? 'Notifications are turned off for Shopzyy, so these alerts won\'t arrive until you allow them.'
        : "When someone goes shopping you get one summary of what they bought, once they're done. Restock reminders arrive at 9 AM on the day Shopzyy expects you to run out, with a button to add the item straight to the list."}>
        <FormRow><Text style={{ flex: 1, fontSize: 17, color: t.label }}>Shopping trip alerts</Text><Switch value={purchases} onValueChange={toggle(StorageKeys.notifyPurchases, setPurchases)} trackColor={{ true: t.green }} /></FormRow>
        <FormRow last={!denied}><Text style={{ flex: 1, fontSize: 17, color: t.label }}>Restock reminders</Text><Switch value={restock} onValueChange={toggle(StorageKeys.notifyRestock, setRestock)} trackColor={{ true: t.green }} /></FormRow>
        {denied ? (
          <FormRow last onPress={() => void Linking.openSettings()}>
            <Ionicons name="notifications-outline" size={20} color={t.accent} style={{ marginRight: 12 }} />
            <Text style={{ fontSize: 17, color: t.accent }}>Turn on notifications in Settings</Text>
          </FormRow>
        ) : null}
      </FormSection>

      <FormSection header="Sync" footer="Lists sync through your account. The app works offline and catches up when you're back online.">
        <FormRow>
          <Text style={{ flex: 1, fontSize: 17, color: t.label }}>Sync</Text>
          <Ionicons name={syncIcon} size={18} color={syncColor} />
          <Text style={{ fontSize: 17, color: syncColor, marginLeft: 6 }}>{syncTitle}</Text>
        </FormRow>
        <FormRow last onPress={() => runtime.restartSync()} disabled={sync.state === 'syncing'}>
          <Ionicons name="sync-outline" size={20} color={t.accent} style={{ marginRight: 12 }} />
          <Text style={{ fontSize: 17, color: t.accent }}>Sync now</Text>
        </FormRow>
      </FormSection>

      <FormSection header="Your data" footer="Diagnostics shows problems the app ran into; they're sent anonymously to help fix them. Deleting your data removes households you created for everyone in them, leaves the ones you joined, and removes your account and profile.">
        <FormRow onPress={() => setDiagnostics(true)}>
          <Ionicons name="pulse-outline" size={20} color={t.accent} style={{ marginRight: 12 }} />
          <Text style={{ fontSize: 17, color: t.label, flex: 1 }}>Diagnostics</Text>
          <Ionicons name="chevron-forward" size={16} color={t.tertiaryLabel} />
        </FormRow>
        <FormRow last onPress={confirmDelete}><Text style={{ fontSize: 17, color: t.red }}>Delete my data…</Text></FormRow>
      </FormSection>

      <View style={{ alignItems: 'center', gap: 4, marginTop: 24 }}>
        <Text style={{ fontSize: 13, fontWeight: '600', color: t.secondaryLabel }}>{Brand.appName} by {Brand.maker}</Text>
        <Text style={{ fontSize: 13, fontStyle: 'italic', color: t.secondaryLabel }}>{Brand.tagline}</Text>
        <Text style={{ fontSize: 13, color: t.secondaryLabel }}>Version {version}</Text>
      </View>

      {editing ? <EditProfileSheet onClose={() => setEditing(false)} /> : null}
      {diagnostics ? <DiagnosticsSheet onClose={() => setDiagnostics(false)} /> : null}
      {deleting ? <View style={{ position: 'absolute', inset: 0, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.25)' }}><ActivityIndicator size="large" /></View> : null}
    </Sheet>
  );
}
