import { Glyph, type SymbolName } from '../../components/Glyph';
import { t, tn } from '../../i18n';
import Constants from 'expo-constants';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { LoadingOverlay } from '../../components/LogoAnimation';
import { PickerRow } from '../../components/Sheet';
import { ScreenOptions } from '../../components/NativeHeader';
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
const linkHost = (Constants.expoConfig?.extra?.linkHost as string | undefined) ?? 'shopzyy-19bc2.web.app';

export function HouseholdScreen({ household }: { household: Household }) {
  const th = useTheme();
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
    if ('error' in result) { Alert.alert(t("Couldn't create an invite"), result.error); return; }
    await Share.share({
      message: t('Join {name} on Shopzyy! Open this link: {link}\n\nOr open Shopzyy and enter the invite code {code}.', { name, link: `https://${linkHost}/join/${result.code}`, code: result.code }),
    });
  };

  // MARK: Removal

  const remove = () => {
    const title = household.isOwnedByMe ? t('Delete {name}?', { name }) : t('Leave {name}?', { name });
    const message = household.isOwnedByMe
      ? t('This deletes the list, history and members for everyone in the household.')
      : t("You'll stop seeing this household's list. Someone can invite you again later.");
    Alert.alert(title, message, [
      { text: t('Cancel'), style: 'cancel' },
      {
        text: household.isOwnedByMe ? t('Delete for everyone') : t('Leave'), style: 'destructive',
        onPress: async () => {
          setRemovalError(null);
          try {
            if ((await service.remove(household)) === 'alreadyGone') {
              Alert.alert(t('{name} no longer exists', { name }), t("It had already been deleted or you were removed from it, so it's been removed from this phone."));
            }
          } catch (error) {
            setRemovalError((household.isOwnedByMe ? t("Couldn't delete the household.") : t("Couldn't leave the household.")) + ' ' + UserFacingError.message(error));
          }
        },
      },
    ]);
  };

  const selected = (theme: HouseholdTheme) => household.customImage === null && household.themeRaw === theme;

  return (
    <ScrollView style={{ flex: 1, backgroundColor: th.groupedBackground }} contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <ScreenOptions largeTitle title={t('Household')} left={<HouseholdSwitcher />} />
      <>
        <FormSection first header={t('Household')}>
          {household.isOwnedByMe ? (
            <FormRow last>
              <TextInput value={draftName} onChangeText={setDraftName} placeholder={t('Name')} placeholderTextColor={th.tertiaryLabel}
                style={{ flex: 1, fontSize: 17, color: th.label }} returnKeyType="done"
                onSubmitEditing={() => service.rename(household, draftName)} onBlur={() => service.rename(household, draftName)} />
            </FormRow>
          ) : (
            <>
              <Labeled label={t('Name')} value={name} last={!owner} />
              {owner ? <Labeled label={t('Created by')} value={owner.name} last /> : null}
            </>
          )}
        </FormSection>

        <FormSection header={t('Background')} footer={t('Pick a mood or use your own photo. Everyone in the household sees it at the top of the list.')}>
          <FormRow style={{ paddingHorizontal: 16, paddingVertical: 8 }}><View style={[s.preview, { flex: 1 }]}><HouseholdBackground household={household} /></View></FormRow>
          <FormRow style={{ paddingHorizontal: 20, paddingVertical: 18 }}>
            <View style={[s.grid, { flex: 1 }]}>
              {HOUSEHOLD_THEMES.map((theme) => (
                <Pressable key={theme} onPress={() => service.setTheme(theme, household)} accessibilityLabel={t('{theme} background', { theme: t(themeTitle(theme)) })}
                  accessibilityState={{ selected: selected(theme) }} style={[s.theme, selected(theme) && { borderColor: th.label, borderWidth: 2 }]}>
                  <HouseholdThemeArt theme={theme} emojiSize={22} />
                  <Text style={s.themeName}>{t(themeTitle(theme))}</Text>
                </Pressable>
              ))}
            </View>
          </FormRow>
          <FormRow last={household.customImage === null} onPress={() => void choosePhoto()}>
            <Glyph name="photo" size={26} color={th.accent} style={{ marginRight: 14 }} />
            <Text style={{ fontSize: 17, color: th.accent }}>{household.customImage === null ? t('Choose a photo') : t('Choose another photo')}</Text>
          </FormRow>
          {household.customImage !== null ? (
            <FormRow last onPress={() => service.setCustomImage(null, household)}>
              <Glyph name="trash" size={20} color={th.red} style={{ marginRight: 12 }} />
              <Text style={{ fontSize: 17, color: th.red }}>{t('Remove photo')}</Text>
            </FormRow>
          ) : null}
        </FormSection>

        <FormSection header={t('Members')} footer={t('Share an invite link or code. When they open it, Shopzyy asks them to set up their profile and they join this household.')}>
          {members.map((m) => (
            <FormRow key={m.id} style={{ gap: 12 }}>
              <MemberBadge emoji={m.emoji} colorHex={m.colorHex} size={32} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 17, color: th.label }}>{m.userRecordName === account.userRecordName ? t('{name} (you)', { name: m.name }) : m.name}</Text>
                {m.userRecordName === household.ownerRecordName ? <Text style={{ fontSize: 12, color: th.secondaryLabel }}>{t('Owner')}</Text> : null}
              </View>
              <Text style={{ fontSize: 13, color: th.secondaryLabel }}>{purchaseSummary(runtime.store.allPurchases().filter((p) => p.member === m).length)}</Text>
            </FormRow>
          ))}
          <FormRow last onPress={() => void invite()} disabled={inviting}>
            <Glyph name="person.badge.plus" size={20} color={th.accent} style={{ marginRight: 12 }} />
            <Text style={{ fontSize: 17, color: th.accent }}>{inviting ? t('Creating invite…') : t('Invite people')}</Text>
          </FormRow>
        </FormSection>

        <FormSection header={t('Organising')} footer={t('Add your own categories and rooms. You can also create them while editing an item.')}>
          <FormRow last onPress={() => setOptions(true)}>
            <Glyph name="tag" size={20} color={th.accent} style={{ marginRight: 12 }} />
            <Text style={{ fontSize: 17, color: th.label, flex: 1 }}>{t('Categories & rooms')}</Text>
            <Glyph name="chevron.right" size={16} color={th.tertiaryLabel} />
          </FormRow>
        </FormSection>

        <FormSection header={t('Shopping totals')} footer={t("After a shopping trip, Shopzyy can ask what it cost. Automatic uses your phone's region; pick a currency to use the same one for everyone in the household.")}>
          <PickerRow label={t('Currency')} value={household.currencyCode} last onChange={(code) => service.setCurrency(code, household)}
            options={[{ title: t('Automatic ({currency})', { currency: currencyTitle(deviceCurrency()) }), value: '' }, ...COMMON_CURRENCIES.map((c) => ({ title: currencyTitle(c), value: c }))]} />
        </FormSection>

        <FormSection footer={t('Notifications, sync, your profile, diagnostics and your data.')}>
          <FormRow last onPress={() => setSettings(true)}>
            <Glyph name="gearshape" size={20} color={th.accent} style={{ marginRight: 12 }} />
            <Text style={{ fontSize: 17, color: th.label, flex: 1 }}>{t('App settings')}</Text>
            <Glyph name="chevron.right" size={16} color={th.tertiaryLabel} />
          </FormRow>
        </FormSection>

        <FormSection footer={removalError ? <Text style={{ fontSize: 13, marginHorizontal: 32, marginTop: 7, color: th.red }}>{removalError}</Text> : undefined}>
          <FormRow last onPress={remove}><Text style={{ fontSize: 17, color: th.red }}>{household.isOwnedByMe ? t('Delete household') : t('Leave household')}</Text></FormRow>
        </FormSection>
      </>

      <LoadingOverlay visible={preparingPhoto} message={t('Preparing photo…')} />
      {options ? <CustomOptionsSheet householdID={household.id} onClose={() => setOptions(false)} /> : null}
      {settings ? <SettingsSheet onClose={() => setSettings(false)} /> : null}
      {pendingPhoto ? (
        <PhotoPositionSheet base64={pendingPhoto} onCancel={() => setPendingPhoto(null)}
          onUse={(x, y) => { service.setCustomImage(pendingPhoto, household, x, y); setPendingPhoto(null); }} />
      ) : null}
    </ScrollView>
  );
}

const purchaseSummary = (n: number) => tn('{n} purchase', '{n} purchases', n);

function Labeled({ label, value, last }: { label: string; value: string; last?: boolean }) {
  const th = useTheme();
  return <FormRow last={last}><Text style={{ fontSize: 17, color: th.label, flex: 1 }}>{label}</Text><Text style={{ fontSize: 17, color: th.secondaryLabel }}>{value}</Text></FormRow>;
}

const s = StyleSheet.create({
  preview: { height: 110, borderRadius: 12, overflow: 'hidden' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  theme: { width: '31%', height: 54, borderRadius: 10, overflow: 'hidden', justifyContent: 'flex-end' },
  themeName: { color: '#fff', fontSize: 11, fontWeight: '700', padding: 6, textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 2 },
});
