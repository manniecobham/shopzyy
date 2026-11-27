import { useState } from 'react';
import { Alert, Platform, Switch, Text, TextInput, View } from 'react-native';
import { Glyph } from '../../components/Glyph';
import { Sheet } from '../../components/Sheet';
import { FormRow, FormSection, ProminentButton } from '../../components/ui';
import { language, t } from '../../i18n';
import { useAccount } from '../../runtime/RuntimeProvider';
import { callFunction } from '../../services/callable';
import { UserFacingError } from '../../services/UserFacingError';
import { appVersion } from '../../services/AppConfig';
import { useTheme } from '../../theme/theme';

const MAX = 1000;
type Kind = 'idea' | 'problem' | 'other';

export function FeedbackSheet({ onClose }: { onClose: () => void }) {
  const th = useTheme();
  const account = useAccount();
  const [kind, setKind] = useState<Kind>('idea');
  const [message, setMessage] = useState('');
  const [contactMe, setContactMe] = useState(false);
  const [sending, setSending] = useState(false);
  const ready = message.trim().length >= 3;

  const kinds: { key: Kind; label: string }[] = [
    { key: 'idea', label: t('An idea') },
    { key: 'problem', label: t('A problem') },
    { key: 'other', label: t('Something else') },
  ];

  const send = async () => {
    if (!ready || sending) return;
    setSending(true);
    try {
      await callFunction('submitFeedback', {
        kind, message: message.trim(), contactMe: contactMe && !!account.email,
        appVersion: appVersion(), platform: Platform.OS, osVersion: String(Platform.Version), language: language(),
      });
      setSending(false);
      Alert.alert(t('Thank you!'), t('Your feedback was sent. We read every message.'), [{ text: t('OK'), onPress: onClose }]);
    } catch (error) {
      setSending(false);
      Alert.alert(t("Couldn't send feedback"), UserFacingError.message(error));
    }
  };

  return (
    <Sheet visible title={t('Send feedback')} cancelTitle={t('Cancel')} onCancel={onClose} busy={sending ? t('Sending…') : null}>
      <FormSection first header={t('This is')}>
        {kinds.map((k, i) => (
          <FormRow key={k.key} last={i === kinds.length - 1} onPress={() => setKind(k.key)}>
            <Text style={{ flex: 1, fontSize: 17, color: th.label }}>{k.label}</Text>
            {kind === k.key ? <Glyph name="checkmark" size={18} color={th.accent} /> : null}
          </FormRow>
        ))}
      </FormSection>

      <FormSection footer={t('We also send your app version and phone type so we can reproduce problems. Your name and account are not attached unless you allow it below.')}>
        <FormRow last>
          <TextInput value={message} onChangeText={setMessage} placeholder={t('What would you like to tell us?')} placeholderTextColor={th.tertiaryLabel}
            multiline maxLength={MAX} textAlignVertical="top" style={{ flex: 1, minHeight: 120, fontSize: 17, color: th.label }} />
        </FormRow>
      </FormSection>

      {account.email ? (
        <FormSection footer={t('Turn this on if you would like a reply.')}>
          <FormRow last>
            <Text style={{ flex: 1, fontSize: 17, color: th.label }}>{t('You can contact me at my account email')}</Text>
            <Switch value={contactMe} onValueChange={setContactMe} trackColor={{ true: th.green }} />
          </FormRow>
        </FormSection>
      ) : null}

      <View style={{ marginHorizontal: 16, marginTop: 12 }}>
        <ProminentButton title={t('Send')} onPress={() => void send()} disabled={!ready || sending} />
      </View>
    </Sheet>
  );
}
