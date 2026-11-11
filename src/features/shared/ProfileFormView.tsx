import { useState } from 'react';
import { t } from '../../i18n';
import { ScrollView, StyleSheet, Text, TextInput, View, Pressable } from 'react-native';
import { Glyph, type SymbolName } from '../../components/Glyph';
import { FormRow, FormSection, ProminentButton } from '../../components/ui';
import { NameNormalizer } from '../../logic/NameNormalizer';
import type { UserProfile } from '../../models/entities';
import { EMOJI_CHOICES, MEMBER_PALETTE } from '../../models/factories';
import { colorFromHex, useTheme } from '../../theme/theme';

/** Edits how the signed-in person appears to their households: name, avatar and colour. Used during setup and from the Household tab. */
export function ProfileFormView({ profile, submitTitle, onSubmit }: {
  profile: UserProfile; submitTitle: string; onSubmit: (profile: UserProfile) => void;
}) {
  const th = useTheme();
  const [name, setName] = useState(profile.name);
  const [emoji, setEmoji] = useState(profile.emoji);
  const [colorHex, setColorHex] = useState(profile.colorHex);
  const trimmed = name.trim();

  const submit = () => {
    if (!trimmed) return;
    onSubmit({ name: NameNormalizer.displayName(trimmed), emoji, colorHex });
  };

  return (
    <ScrollView style={{ backgroundColor: th.groupedBackground }} contentContainerStyle={{ paddingBottom: 40 }} keyboardShouldPersistTaps="handled" contentInsetAdjustmentBehavior="automatic">
      <FormSection footer={t('This is how you appear to everyone in your households.')}>
        <FormRow last style={{ gap: 14, paddingVertical: 12 }}>
          <View style={[s.avatar, { backgroundColor: colorFromHex(colorHex, 0.22) }]}><Text style={{ fontSize: 28 }}>{emoji}</Text></View>
          <TextInput
            style={{ flex: 1, fontSize: 20, color: th.label }}
            placeholder={t('Your name')} placeholderTextColor={th.tertiaryLabel}
            value={name} onChangeText={setName} textContentType="givenName" autoFocus={trimmed === ''}
            returnKeyType="done" onSubmitEditing={submit} maxLength={40}
          />
        </FormRow>
      </FormSection>

      <FormSection header={t('Avatar')}>
        <View style={s.grid}>
          {EMOJI_CHOICES.map((choice) => (
            <Pressable key={choice} onPress={() => setEmoji(choice)} accessibilityState={{ selected: choice === emoji }}
              style={[s.emojiCell, choice === emoji && { backgroundColor: colorFromHex(th.accent, 0.18) }]}>
              <Text style={{ fontSize: 26 }}>{choice}</Text>
            </Pressable>
          ))}
        </View>
      </FormSection>

      <FormSection header={t('Colour')}>
        <View style={s.palette}>
          {MEMBER_PALETTE.map((hex) => (
            <Pressable key={hex} onPress={() => setColorHex(hex)} accessibilityState={{ selected: hex === colorHex }} style={{ flex: 1, alignItems: 'center' }}>
              <View style={[s.swatch, { backgroundColor: hex }]}>
                {hex === colorHex ? <Glyph name="checkmark" size={16} color="#fff" /> : null}
              </View>
            </Pressable>
          ))}
        </View>
      </FormSection>

      <View style={{ marginHorizontal: 16, marginTop: 28 }}>
        <ProminentButton title={submitTitle} onPress={submit} disabled={trimmed === ''} />
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  avatar: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', padding: 10, rowGap: 4 },
  emojiCell: { width: '16.66%', height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  palette: { flexDirection: 'row', paddingVertical: 14, paddingHorizontal: 8 },
  swatch: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
});
