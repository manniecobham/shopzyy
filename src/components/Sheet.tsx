import { Glyph, type SymbolName } from './Glyph';
import { useState as useStateLocal, type ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FormRow, FormSection, TextButton } from './ui';
import { useTheme } from '../theme/theme';

/** An iOS page sheet with a Cancel / title / Save bar, like a SwiftUI sheet around a NavigationStack. */
export function Sheet({ visible, title, onCancel, onSave, saveTitle = 'Save', cancelTitle = 'Cancel', saveDisabled, children, scroll = true }: {
  visible: boolean; title: string; onCancel: () => void; onSave?: () => void; saveTitle?: string; cancelTitle?: string;
  saveDisabled?: boolean; children: ReactNode; scroll?: boolean;
}) {
  const t = useTheme();
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onCancel}>
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: t.groupedBackground }}>
        <View style={s.bar}>
          <View style={s.side}><TextButton title={cancelTitle} onPress={onCancel} /></View>
          <Text style={[s.title, { color: t.label }]} numberOfLines={1}>{title}</Text>
          <View style={[s.side, { alignItems: 'flex-end' }]}>
            {onSave ? <TextButton title={saveTitle} onPress={onSave} disabled={saveDisabled} style={{ fontWeight: '600' }} /> : null}
          </View>
        </View>
        {scroll ? (
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 40 }}>{children}</ScrollView>
        ) : children}
      </SafeAreaView>
    </Modal>
  );
}

export interface MenuItem {
  title: string;
  icon?: SymbolName;
  destructive?: boolean;
  checked?: boolean;
  disabled?: boolean;
  onPress: () => void;
}

/** A bottom action list: the SwiftUI `Menu` / `Picker` popovers. */
export function ActionMenu({ visible, title, sections, onClose }: {
  visible: boolean; title?: string; sections: MenuItem[][]; onClose: () => void;
}) {
  const t = useTheme();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose} accessibilityLabel="Close menu" />
      <SafeAreaView edges={['bottom']} style={s.sheetWrap} pointerEvents="box-none">
        <View style={[s.menu, { backgroundColor: t.groupedBackground }]}>
          {title ? <Text style={[s.menuTitle, { color: t.secondaryLabel }]}>{title}</Text> : null}
          <ScrollView style={{ maxHeight: 440 }} bounces={false}>
            {sections.map((items, i) => (
              <FormSection key={i}>
                {items.map((item, j) => (
                  <FormRow key={item.title} last={j === items.length - 1} disabled={item.disabled}
                    onPress={() => { onClose(); item.onPress(); }} style={{ opacity: item.disabled ? 0.4 : 1 }}>
                    {item.icon ? <Glyph name={item.icon} size={20} color={item.destructive ? t.red : t.accent} style={{ marginRight: 12 }} /> : null}
                    <Text style={{ flex: 1, fontSize: 17, color: item.destructive ? t.red : t.label }}>{item.title}</Text>
                    {item.checked ? <Glyph name="checkmark" size={20} color={t.accent} /> : null}
                  </FormRow>
                ))}
              </FormSection>
            ))}
          </ScrollView>
          <View style={{ marginHorizontal: 16, marginTop: 14, marginBottom: 6 }}>
            <Pressable onPress={onClose} style={[s.cancel, { backgroundColor: t.cell }]}>
              <Text style={{ fontSize: 17, fontWeight: '600', color: t.accent }}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

/** A form row that shows the current value and opens a list to change it (SwiftUI `Picker`). */
export function PickerRow<T>({ label, value, options, onChange, last, hideLabel }: {
  label: string; value: T; options: { title: string; value: T }[]; onChange: (v: T) => void; last?: boolean; hideLabel?: boolean;
}) {
  const t = useTheme();
  const [open, setOpen] = useStateLocal(false);
  const current = options.find((o) => Object.is(o.value, value));
  return (
    <>
      <FormRow last={last} onPress={() => setOpen(true)}>
        {hideLabel ? null : <Text style={{ fontSize: 17, color: t.label, flex: 1 }}>{label}</Text>}
        <Text style={{ fontSize: 17, color: t.secondaryLabel, flex: hideLabel ? 1 : undefined, textAlign: hideLabel ? 'left' : 'right' }} numberOfLines={1}>{current?.title ?? ''}</Text>
        <Glyph name="chevron.up.chevron.down" size={16} color={t.tertiaryLabel} style={{ marginLeft: 6 }} />
      </FormRow>
      <ActionMenu visible={open} title={label} onClose={() => setOpen(false)}
        sections={[options.map((o) => ({ title: o.title, checked: Object.is(o.value, value), onPress: () => onChange(o.value) }))]} />
    </>
  );
}

const s = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, height: 52 },
  side: { width: 80 },
  title: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '600' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheetWrap: { flex: 1, justifyContent: 'flex-end' },
  menu: { borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingTop: 12, paddingBottom: 8 },
  menuTitle: { fontSize: 13, textAlign: 'center', marginBottom: 2 },
  cancel: { minHeight: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
