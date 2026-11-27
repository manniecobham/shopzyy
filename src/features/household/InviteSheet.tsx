import { Text } from 'react-native';
import { Glyph } from '../../components/Glyph';
import { Sheet } from '../../components/Sheet';
import { FormRow, FormSection } from '../../components/ui';
import { useTheme } from '../../theme/theme';
import { t as tr } from '../../i18n';

export type InviteChoice = 'share' | 'qr';

export function InviteSheet({ onPick, onClose }: { onPick: (choice: InviteChoice) => void; onClose: () => void }) {
  const th = useTheme();
  return (
    <Sheet visible title={tr('Invite people')} cancelTitle={tr('Cancel')} onCancel={onClose}>
      <FormSection first footer={tr('Share an invite link or code. When they open it, Shopzyy asks them to set up their profile and they join this household.')}>
        <FormRow onPress={() => onPick('share')}>
          <Glyph name="paperplane" size={20} color={th.accent} style={{ marginRight: 12 }} />
          <Text style={{ fontSize: 17, color: th.label, flex: 1 }}>{tr('Share link or code')}</Text>
          <Glyph name="chevron.right" size={16} color={th.tertiaryLabel} />
        </FormRow>
        <FormRow last onPress={() => onPick('qr')}>
          <Glyph name="qrcode" size={20} color={th.accent} style={{ marginRight: 12 }} />
          <Text style={{ fontSize: 17, color: th.label, flex: 1 }}>{tr('Show QR code')}</Text>
          <Glyph name="chevron.right" size={16} color={th.tertiaryLabel} />
        </FormRow>
      </FormSection>
    </Sheet>
  );
}
