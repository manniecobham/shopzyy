import { Ionicons } from '@expo/vector-icons';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { LoadingOverlay } from '../../components/LogoAnimation';
import { PickerRow } from '../../components/Sheet';
import { ScreenHeader } from '../../components/ScreenHeader';
import { FormRow, FormSection, MemberBadge } from '../../components/ui';
import { COMMON_CURRENCIES, currencyTitle } from '../../lib/currencies';
import { deviceCurrency } from '../../lib/format';
import { HOUSEHOLD_THEMES, themeTitle, type HouseholdTheme } from '../../models/enums';
import type { Household } from '../../models/entities';
import { useAccount, useRuntime, useStoreVersion } from '../../runtime/RuntimeProvider';
import { UserFacingError } from '../../services/UserFacingError';
import { useTheme } from '../../theme/theme';
import { SettingsSheet } from '../shared/SettingsSheet';
import { CustomOptionsSheet } from './CustomOptionsSheet';
import { HouseholdBackground, HouseholdThemeArt, householdDisplayName } from './HouseholdBackground';
import { HouseholdSwitcher } from './HouseholdSwitcher';
import { PhotoPositionSheet } from './PhotoPositionSheet';

const BANNER_WIDTH = 1200;

export function HouseholdScreen({ household }: { household: Household }) {
  const t = useTheme();
  const runtime = useRuntime();
  const account = useAccount();
  useStoreVersion();
  const service = runtime.households;
  const members = runtime.store.membersOf(household.id);
  const owner = members.find((m) => m.userRecordName === household.ownerRecordName);

  const [draftName, setDraftName] = useState(household.name);
  const [pendingPhoto, setPendingPhoto] = useState<string | null>(null);
  const [options, setOptions] = useState(false);
  const [settings, setSettings] = useState(false);
  const [removalError, setRemovalError] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);
  const [preparingPhoto, setPreparingPhoto] = useState(false);
  useEffect(() => setDraftName(household.name), [household.name]);

  const name = householdDisplayName(household);

  // MARK: Photo

  const choosePhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setPreparingPhoto(true);
    try {
    // Shrink to banner size before it's stored and synced, so every member downloads ~150 KB instead of a full-resolution picture.
    let ctx = ImageManipulator.ImageManipulator.manipulate(asset.uri);
    if (asset.width > BANNER_WIDTH) ctx = ctx.resize({ width: BANNER_WIDTH });
    const image = await (await ctx.renderAsync()).saveAsync({ format: ImageManipulator.SaveFormat.JPEG, compress: 0.75, base64: true });
    if (image.base64) setPendingPhoto(image.base64);
    } finally {
      setPreparingPhoto(false);
    }
  };

  // MARK: Invite

  const invite = async () => {
    setInviting(true);
    const result = await runtime.createInvite(household.id);
    setInviting(false);
    if ('error' in result) { Alert.alert("Couldn't create an invite", result.error); return; }
    await Share.share({
      message: `Join ${name} on Shopzyy! Open this link: shopzyy://join/${result.code}\n\nOr open Shopzyy and enter the invite code ${result.code}.`,
    });
  };

  // MARK: Removal

  const remove = () => {
    const title = household.isOwnedByMe ? `Delete ${name}?` : `Leave ${name}?`;
    const message = household.isOwnedByMe
      ? 'This deletes the list, history and members for everyone in the household.'
      : "You'll stop seeing this household's list. Someone can invite you again later.";
    Alert.alert(title, message, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: household.isOwnedByMe ? 'Delete for everyone' : 'Leave', style: 'destructive',
        onPress: async () => {
          setRemovalError(null);
          try {
            if ((await service.remove(household)) === 'alreadyGone') {
              Alert.alert(`${name} no longer exists`, "It had already been deleted or you were removed from it, so it's been removed from this phone.");
            }
          } catch (error) {
            setRemovalError((household.isOwnedByMe ? "Couldn't delete the household. " : "Couldn't leave the household. ") + UserFacingError.message(error));
          }
        },
      },
    ]);
  };

  const selected = (theme: HouseholdTheme) => household.customImage === null && household.themeRaw === theme;

  return (
    <View style={{ flex: 1, backgroundColor: t.groupedBackground }}>
      <ScreenHeader title="Household" leading={<HouseholdSwitcher />} />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
        <FormSection header="Household">
          {household.isOwnedByMe ? (
            <FormRow last>
              <TextInput value={draftName} onChangeText={setDraftName} placeholder="Name" placeholderTextColor={t.tertiaryLabel}
                style={{ flex: 1, fontSize: 17, color: t.label }} returnKeyType="done"
                onSubmitEditing={() => service.rename(household, draftName)} onBlur={() => service.rename(household, draftName)} />
            </FormRow>
          ) : (
            <>
              <Labeled label="Name" value={name} last={!owner} />
              {owner ? <Labeled label="Created by" value={owner.name} last /> : null}
            </>
          )}
        </FormSection>

        <FormSection header="Background" footer="Pick a mood or use your own photo. Everyone in the household sees it at the top of the list.">
          <View style={{ padding: 16, gap: 12 }}>
            <View style={s.preview}><HouseholdBackground household={household} /></View>
            <View style={s.grid}>
              {HOUSEHOLD_THEMES.map((theme) => (
                <Pressable key={theme} onPress={() => service.setTheme(theme, household)} accessibilityLabel={`${themeTitle(theme)} background`}
                  accessibilityState={{ selected: selected(theme) }} style={[s.theme, selected(theme) && { borderColor: t.label, borderWidth: 2 }]}>
                  <HouseholdThemeArt theme={theme} emojiSize={22} />
                  <Text style={s.themeName}>{themeTitle(theme)}</Text>
                </Pressable>
              ))}
            </View>
          </View>
          <FormRow last={household.customImage === null} onPress={() => void choosePhoto()}>
            <Ionicons name="image-outline" size={20} color={t.accent} style={{ marginRight: 12 }} />
            <Text style={{ fontSize: 17, color: t.accent }}>{household.customImage === null ? 'Choose a photo' : 'Choose another photo'}</Text>
          </FormRow>
          {household.customImage !== null ? (
            <FormRow last onPress={() => service.setCustomImage(null, household)}>
              <Ionicons name="trash-outline" size={20} color={t.red} style={{ marginRight: 12 }} />
              <Text style={{ fontSize: 17, color: t.red }}>Remove photo</Text>
            </FormRow>
          ) : null}
        </FormSection>

        <FormSection header="Members" footer="Share an invite link or code. When they open it, Shopzyy asks them to set up their profile and they join this household.">
          {members.map((m) => (
            <FormRow key={m.id} style={{ gap: 12 }}>
              <MemberBadge emoji={m.emoji} colorHex={m.colorHex} size={32} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 17, color: t.label }}>{m.userRecordName === account.userRecordName ? `${m.name} (you)` : m.name}</Text>
                {m.userRecordName === household.ownerRecordName ? <Text style={{ fontSize: 12, color: t.secondaryLabel }}>Owner</Text> : null}
              </View>
              <Text style={{ fontSize: 13, color: t.secondaryLabel }}>{purchaseSummary(runtime.store.allPurchases().filter((p) => p.member === m).length)}</Text>
            </FormRow>
          ))}
          <FormRow last onPress={() => void invite()} disabled={inviting}>
            <Ionicons name="person-add-outline" size={20} color={t.accent} style={{ marginRight: 12 }} />
            <Text style={{ fontSize: 17, color: t.accent }}>{inviting ? 'Creating invite…' : 'Invite people'}</Text>
          </FormRow>
        </FormSection>

        <FormSection header="Organising" footer="Add your own categories and rooms. You can also create them while editing an item.">
          <FormRow last onPress={() => setOptions(true)}>
            <Ionicons name="pricetag-outline" size={20} color={t.accent} style={{ marginRight: 12 }} />
            <Text style={{ fontSize: 17, color: t.label, flex: 1 }}>Categories & rooms</Text>
            <Ionicons name="chevron-forward" size={16} color={t.tertiaryLabel} />
          </FormRow>
        </FormSection>

        <FormSection header="Shopping totals" footer="After a shopping trip, Shopzyy can ask what it cost. Automatic uses your phone's region; pick a currency to use the same one for everyone in the household.">
          <PickerRow label="Currency" value={household.currencyCode} last onChange={(code) => service.setCurrency(code, household)}
            options={[{ title: `Automatic (${currencyTitle(deviceCurrency())})`, value: '' }, ...COMMON_CURRENCIES.map((c) => ({ title: currencyTitle(c), value: c }))]} />
        </FormSection>

        <FormSection footer="Notifications, sync, your profile, diagnostics and your data.">
          <FormRow last onPress={() => setSettings(true)}>
            <Ionicons name="settings-outline" size={20} color={t.accent} style={{ marginRight: 12 }} />
            <Text style={{ fontSize: 17, color: t.label, flex: 1 }}>App settings</Text>
            <Ionicons name="chevron-forward" size={16} color={t.tertiaryLabel} />
          </FormRow>
        </FormSection>

        <FormSection footer={removalError ? <Text style={{ fontSize: 13, marginHorizontal: 32, marginTop: 7, color: t.red }}>{removalError}</Text> : undefined}>
          <FormRow last onPress={remove}><Text style={{ fontSize: 17, color: t.red }}>{household.isOwnedByMe ? 'Delete household' : 'Leave household'}</Text></FormRow>
        </FormSection>
      </ScrollView>

      <LoadingOverlay visible={preparingPhoto} message="Preparing photo…" />
      {options ? <CustomOptionsSheet householdID={household.id} onClose={() => setOptions(false)} /> : null}
      {settings ? <SettingsSheet onClose={() => setSettings(false)} /> : null}
      {pendingPhoto ? (
        <PhotoPositionSheet base64={pendingPhoto} onCancel={() => setPendingPhoto(null)}
          onUse={(x, y) => { service.setCustomImage(pendingPhoto, household, x, y); setPendingPhoto(null); }} />
      ) : null}
    </View>
  );
}

const purchaseSummary = (n: number) => (n === 1 ? '1 purchase' : `${n} purchases`);

function Labeled({ label, value, last }: { label: string; value: string; last?: boolean }) {
  const t = useTheme();
  return <FormRow last={last}><Text style={{ fontSize: 17, color: t.label, flex: 1 }}>{label}</Text><Text style={{ fontSize: 17, color: t.secondaryLabel }}>{value}</Text></FormRow>;
}

const s = StyleSheet.create({
  preview: { height: 110, borderRadius: 12, overflow: 'hidden' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  theme: { width: '31%', height: 54, borderRadius: 10, overflow: 'hidden', justifyContent: 'flex-end' },
  themeName: { color: '#fff', fontSize: 11, fontWeight: '700', padding: 6, textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 2 },
});
