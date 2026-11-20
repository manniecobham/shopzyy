import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Glyph } from '../../components/Glyph';
import { Sheet } from '../../components/Sheet';
import { FormRow, FormSection } from '../../components/ui';
import { HOUSEHOLD_THEMES, themeTitle, type HouseholdTheme } from '../../models/enums';
import type { Household } from '../../models/entities';
import { useAppState, useStoreVersion } from '../../runtime/RuntimeProvider';
import { useTheme } from '../../theme/theme';
import { t } from '../../i18n';
import { HouseholdBackground, HouseholdThemeArt } from './HouseholdBackground';

// The photo picker is started by the screen after this sheet has closed, so two native layers never overlap.
export function BackgroundSheet({ household, onChoosePhoto, onClose }: { household: Household; onChoosePhoto: () => void; onClose: () => void }) {
  const th = useTheme();
  const runtime = useAppState();
  const service = runtime.households;
  useStoreVersion();
  const selected = (theme: HouseholdTheme) => household.customImage === null && household.themeRaw === theme;
  return (
    <Sheet visible title={t('Background')} doneTitle={t('Done')} onCancel={onClose}>
      <FormSection first footer={t('Pick a mood or use your own photo. Everyone in the household sees it at the top of the list.')}>
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
        <FormRow last={household.customImage === null} onPress={onChoosePhoto}>
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
    </Sheet>
  );
}

const s = StyleSheet.create({
  preview: { height: 110, borderRadius: 12, overflow: 'hidden' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  theme: { width: '31%', height: 54, borderRadius: 10, overflow: 'hidden', justifyContent: 'flex-end' },
  themeName: { color: '#fff', fontSize: 11, fontWeight: '700', padding: 6, textShadowColor: 'rgba(0,0,0,0.5)', textShadowRadius: 2 },
});
