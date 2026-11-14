import { Text, View } from 'react-native';
import { Glyph, type SymbolName } from '../../components/Glyph';
import { Sheet } from '../../components/Sheet';
import { t as tr } from '../../i18n';
import { useTheme } from '../../theme/theme';

export function ReceiptIntroSheet({ onContinue, onCancel }: { onContinue: () => void; onCancel: () => void }) {
  const t = useTheme();
  const steps: { icon: SymbolName; title: string; body: string }[] = [
    { icon: 'photo', title: tr('Snap the receipt'), body: tr('Take a photo or pick one from your library.') },
    { icon: 'checklist', title: tr('Check what we found'), body: tr("See the total and how each line matches your list. Fix anything that's wrong.") },
    { icon: 'checkmark.circle.fill', title: tr('Tick off and save'), body: tr('Matched items are ticked off and the trip total is saved.') },
    { icon: 'checkmark.seal', title: tr('Private by design'), body: tr('The photo is read on this device, then deleted. It is never saved or uploaded.') },
  ];
  return (
    <Sheet visible title={tr('Scan receipt')} saveTitle={tr('Continue')} onCancel={onCancel} onSave={onContinue}>
      <View style={{ padding: 24, gap: 22 }}>
        <Text style={{ fontSize: 22, fontWeight: '700', color: t.label }}>{tr('Add your shopping trip in seconds')}</Text>
        {steps.map((step) => (
          <View key={step.title} style={{ flexDirection: 'row', gap: 16, alignItems: 'flex-start' }}>
            <Glyph name={step.icon} size={28} color={t.accent} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={{ fontSize: 17, fontWeight: '600', color: t.label }}>{step.title}</Text>
              <Text style={{ fontSize: 15, color: t.secondaryLabel }}>{step.body}</Text>
            </View>
          </View>
        ))}
      </View>
    </Sheet>
  );
}
