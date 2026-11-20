import { Glyph, type SymbolName } from '../../components/Glyph';
import { t, tn } from '../../i18n';
import Constants from 'expo-constants';
import * as ImageManipulator from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useMemo, useState } from 'react';
import { Alert, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { InlineLoading } from '../../components/LogoAnimation';
import { PickerRow } from '../../components/Sheet';
import { ScreenOptions } from '../../components/NativeHeader';
import { FormRow, FormSection, MemberBadge } from '../../components/ui';
import { COMMON_CURRENCIES, currencyTitle } from '../../lib/currencies';
import { deviceCurrency } from '../../lib/format';
import { inviteLink } from '../../lib/inviteCode';
import { themeTitle, type HouseholdTheme } from '../../models/enums';
import type { Household } from '../../models/entities';
import { useAccount, useRuntime, useStoreVersion } from '../../runtime/RuntimeProvider';
import { UserFacingError } from '../../services/UserFacingError';
import { useTheme } from '../../theme/theme';
import { SettingsSheet } from '../shared/SettingsSheet';
import { CustomOptionsSheet } from './CustomOptionsSheet';
import { HouseholdBackground, householdDisplayName } from './HouseholdBackground';
import { HouseholdSwitcher } from './HouseholdSwitcher';
import { InviteQRSheet } from './InviteQRSheet';
import { BackgroundSheet } from './BackgroundSheet';
import { InviteSheet, type InviteChoice } from './InviteSheet';
import { PhotoPositionSheet } from './PhotoPositionSheet';

const BANNER_WIDTH = 1200;
const MAX_BANNER_CHARS = 700_000;
const linkHost = (Constants.expoConfig?.extra?.linkHost as string | undefined) ?? 'shopzyy-19bc2.web.app';

export function HouseholdScreen({ household }: { household: Household }) {
  const th = useTheme();
  const runtime = useRuntime();
  const account = useAccount();
  const service = runtime.households;
  const members = runtime.store.membersOf(household.id);
  const storeVersion = useStoreVersion();
  const purchaseCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of runtime.store.allPurchases()) if (p.member) counts.set(p.member.id, (counts.get(p.member.id) ?? 0) + 1);
    return counts;
  }, [storeVersion]); // eslint-disable-line react-hooks/exhaustive-deps
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
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.8, exif: false });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    setPreparingPhoto(true);
    let base64: string | null = null;
    try {
      for (const [width, compress] of [[BANNER_WIDTH, 0.7], [800, 0.6]] as const) {
        let ctx = ImageManipulator.ImageManipulator.manipulate(asset.uri);
        if (asset.width > width) ctx = ctx.resize({ width });
        const image = await (await ctx.renderAsync()).saveAsync({ format: ImageManipulator.SaveFormat.JPEG, compress, base64: true });
        if (image.base64 && image.base64.length <= MAX_BANNER_CHARS) { base64 = image.base64; break; }
      }
    } catch {
      base64 = null;
    } finally {
      setPreparingPhoto(false);
    }
    if (!base64) { Alert.alert(t("Couldn't use that photo"), t('Try a different photo.')); return; }
    setTimeout(() => setPendingPhoto(base64), 450);
  };

  // MARK: Invite

  const [qr, setQr] = useState<string | null>(null);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [backgroundOpen, setBackgroundOpen] = useState(false);
  const [makingQr, setMakingQr] = useState(false);

  const showQr = async () => {
    setMakingQr(true);
    const result = await runtime.createInvite(household.id);
    setMakingQr(false);
    if ('error' in result) { Alert.alert(t("Couldn't create an invite"), result.error); return; }
    setQr(result.code);
  };

  const invite = async () => {
    setInviting(true);
    const result = await runtime.createInvite(household.id);
    setInviting(false);
    if ('error' in result) { Alert.alert(t("Couldn't create an invite"), result.error); return; }
    await Share.share({
      message: t('Join {name} on Shopzyy! Open this link: {link}\n\nOr open Shopzyy and enter the invite code {code}.', { name, link: inviteLink(linkHost, result.code), code: result.code }),
    });
  };

  // A sheet closes before the next native layer opens, so two never overlap on screen.
  const afterSheet = (action: () => void) => setTimeout(action, 450);
  const pickInvite = (choice: InviteChoice) => {
    setInviteOpen(false);
    afterSheet(() => void (choice === 'share' ? invite() : showQr()));
  };
  const pickPhoto = () => {
    setBackgroundOpen(false);
    afterSheet(() => void choosePhoto());
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

  return (
    <ScrollView style={{ flex: 1, backgroundColor: th.groupedBackground }} contentInsetAdjustmentBehavior="automatic" contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      <ScreenOptions largeTitle title={t('Household')} left={<HouseholdSwitcher />} />
      <>
        <View style={{ marginHorizontal: 16, marginTop: 8 }}><View style={s.banner}><HouseholdBackground household={household} /></View></View>

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

        <FormSection header={t('Members')}>
          {members.map((m) => (
            <FormRow key={m.id} style={{ gap: 12 }}>
              <MemberBadge emoji={m.emoji} colorHex={m.colorHex} size={32} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 17, color: th.label }}>{m.userRecordName === account.userRecordName ? t('{name} (you)', { name: m.name }) : m.name}</Text>
                {m.userRecordName === household.ownerRecordName ? <Text style={{ fontSize: 12, color: th.secondaryLabel }}>{t('Owner')}</Text> : null}
              </View>
              <Text style={{ fontSize: 13, color: th.secondaryLabel }}>{purchaseSummary(purchaseCounts.get(m.id) ?? 0)}</Text>
            </FormRow>
          ))}
          <FormRow last onPress={() => setInviteOpen(true)}>
            <Glyph name="person.badge.plus" size={20} color={th.accent} style={{ marginRight: 12 }} />
            <Text style={{ fontSize: 17, color: th.accent }}>{t('Invite people')}</Text>
          </FormRow>
        </FormSection>

        <FormSection footer={t('Add your own categories and rooms. You can also create them while editing an item.')}>
          <FormRow onPress={() => setBackgroundOpen(true)}>
            <Glyph name="photo" size={20} color={th.accent} style={{ marginRight: 12 }} />
            <Text style={{ fontSize: 17, color: th.label, flex: 1 }}>{t('Background')}</Text>
            <Text style={{ fontSize: 17, color: th.secondaryLabel, marginRight: 6 }}>{household.customImage !== null ? t('Photo') : t(themeTitle(household.themeRaw as HouseholdTheme))}</Text>
            <Glyph name="chevron.right" size={16} color={th.tertiaryLabel} />
          </FormRow>
          <FormRow last onPress={() => setOptions(true)}>
            <Glyph name="tag" size={20} color={th.accent} style={{ marginRight: 12 }} />
            <Text style={{ fontSize: 17, color: th.label, flex: 1 }}>{t('Categories & rooms')}</Text>
            <Glyph name="chevron.right" size={16} color={th.tertiaryLabel} />
          </FormRow>
        </FormSection>

        <FormSection footer={t("After a shopping trip, Shopzyy can ask what it cost. Automatic uses your phone's region; pick a currency to use the same one for everyone in the household.")}>
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

      <InlineLoading visible={preparingPhoto || inviting || makingQr} message={preparingPhoto ? t('Preparing photo…') : t('Creating invite…')} />
      {options ? <CustomOptionsSheet householdID={household.id} onClose={() => setOptions(false)} /> : null}
      {settings ? <SettingsSheet onClose={() => setSettings(false)} /> : null}
      {qr ? <InviteQRSheet name={name} code={qr} link={inviteLink(linkHost, qr)} onClose={() => setQr(null)} /> : null}
      {inviteOpen ? <InviteSheet onPick={pickInvite} onClose={() => setInviteOpen(false)} /> : null}
      {backgroundOpen ? <BackgroundSheet household={household} onChoosePhoto={pickPhoto} onClose={() => setBackgroundOpen(false)} /> : null}
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
  banner: { height: 120, borderRadius: 16, overflow: 'hidden' },
});
