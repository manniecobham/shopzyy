import { TextInput } from 'react-native';
import { Sheet } from '../../components/Sheet';
import { FormRow, FormSection, TextButton } from '../../components/ui';
import { useTheme } from '../../theme/theme';
import { t as tr } from '../../i18n';
import { useJoinHousehold } from './useJoinHousehold';

export function JoinSheet({ onClose }: { onClose: () => void }) {
  const th = useTheme();
  const join = useJoinHousehold(onClose);
  return (
    <Sheet visible title={tr('Join a household')} cancelTitle={tr('Cancel')} onCancel={onClose}
      busy={join.joining || join.arriving ? join.message : null}>
      <FormSection first footer={join.error ?? tr('Enter the invite code, or paste the link you were sent.')}>
        <FormRow>
          <TextInput style={{ flex: 1, fontSize: 17, minHeight: 28, color: th.label, letterSpacing: 2 }} placeholder={tr('Invite code')} placeholderTextColor={th.tertiaryLabel}
            value={join.code} onChangeText={join.setText} autoCapitalize="characters" autoCorrect={false} autoFocus
            returnKeyType="join" onSubmitEditing={() => void join.join()} />
        </FormRow>
        {join.canPaste ? <FormRow><TextButton title={tr('Paste invite code')} onPress={() => void join.paste()} /></FormRow> : null}
        <FormRow last>
          <TextButton title={join.joining ? tr('Joining…') : tr('Join household')} onPress={() => void join.join()} disabled={join.joining || join.code.trim().length === 0} />
        </FormRow>
      </FormSection>
    </Sheet>
  );
}
