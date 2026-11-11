import { Glyph, type SymbolName } from '../../components/Glyph';
import { useState, useSyncExternalStore } from 'react';
import { Text, View } from 'react-native';
import { ActionMenu, Sheet } from '../../components/Sheet';
import { FormRow, FormSection, TextButton } from '../../components/ui';
import { AppLog, LOG_AREA_TITLE, type LogEntry } from '../../services/AppLog';
import { Brand, useTheme } from '../../theme/theme';

/** Problems the app ran into, in plain language. The technical details stay out of sight: they're sent anonymously to the developer. */
export function DiagnosticsSheet({ onClose }: { onClose: () => void }) {
  const t = useTheme();
  useSyncExternalStore(AppLog.subscribe, AppLog.getSnapshot);
  const [menu, setMenu] = useState(false);
  const entries = AppLog.entries;

  return (
    <Sheet visible title="Diagnostics" cancelTitle="Done" onCancel={onClose}
      onSave={entries.length > 0 ? () => setMenu(true) : undefined} saveTitle="More">
      {entries.length === 0 ? (
        <View style={{ alignItems: 'center', gap: 8, paddingTop: 80, paddingHorizontal: 40 }}>
          <Glyph name="checkmark.seal" size={44} color={t.secondaryLabel} />
          <Text style={{ fontSize: 20, fontWeight: '600', color: t.label }}>All good</Text>
          <Text style={{ fontSize: 15, color: t.secondaryLabel, textAlign: 'center' }}>If something goes wrong, it will show up here.</Text>
        </View>
      ) : (
        <FormSection footer={`Reports contain no names, list items or account details. They're sent anonymously to ${Brand.maker} to help fix problems.`}>
          {entries.map((e, i) => <Row key={e.id} entry={e} last={i === entries.length - 1} />)}
        </FormSection>
      )}
      <ActionMenu visible={menu} onClose={() => setMenu(false)} sections={[[
        { title: 'Send report now', icon: 'paperplane', onPress: () => void AppLog.uploadPending() },
        { title: 'Clear', icon: 'trash', destructive: true, onPress: () => AppLog.clear() },
      ]]} />
    </Sheet>
  );
}

function Row({ entry, last }: { entry: LogEntry; last: boolean }) {
  const t = useTheme();
  const error = entry.level === 'error';
  const info = entry.level === 'info';
  return (
    <FormRow last={last} style={{ alignItems: 'flex-start', gap: 12 }}>
      <Glyph name={error ? 'exclamationmark.circle.fill' : info ? 'info.circle.fill' : 'exclamationmark.triangle.fill'} size={20} color={error ? t.red : info ? t.accent : t.orange} style={{ marginTop: 2 }} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text style={{ fontSize: 15, fontWeight: '500', color: t.label }}>{entry.message}</Text>
        <Text style={{ fontSize: 12, color: t.secondaryLabel }}>
          {LOG_AREA_TITLE[entry.area]} · {new Date(entry.date).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
        </Text>
      </View>
      {entry.isUploaded ? <Glyph name="checkmark.icloud" size={16} color={t.secondaryLabel} accessibilityLabel="Reported" /> : null}
    </FormRow>
  );
}

export { TextButton };
