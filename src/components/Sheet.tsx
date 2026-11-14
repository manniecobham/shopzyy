import { Glyph, type SymbolName } from './Glyph';
import { t as tr } from '../i18n';
import { useRef, useState as useStateLocal, type ComponentRef, type ReactNode } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeMenu } from './NativeMenu';
import { FormRow, FormSection, TextButton } from './ui';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { isIOS26, useTheme } from '../theme/theme';

export function Sheet({ visible, title, onCancel, onSave, saveTitle = tr('Save'), cancelTitle = tr('Cancel'), doneTitle, saveDisabled, children, scroll = true }: {
  visible: boolean; title: string; onCancel: () => void; onSave?: () => void; saveTitle?: string; cancelTitle?: string;
  doneTitle?: string;
  saveDisabled?: boolean; children: ReactNode; scroll?: boolean;
}) {
  const t = useTheme();
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onCancel}>
      <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: t.groupedBackground }}>
        <View style={s.bar}>
          <View style={s.side}>{doneTitle ? null : <BarButton title={cancelTitle} onPress={onCancel} />}</View>
          <Text style={[s.title, { color: t.label }]} numberOfLines={1}>{title}</Text>
          <View style={[s.side, { alignItems: 'flex-end' }]}>
            {doneTitle ? <BarButton title={doneTitle} onPress={onCancel} prominent />
              : onSave ? <BarButton title={saveTitle} onPress={onSave} disabled={saveDisabled} prominent /> : null}
          </View>
        </View>
        {scroll ? (
          <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: 40 }}>{children}</ScrollView>
        ) : children}
      </SafeAreaView>
    </Modal>
  );
}

function BarButton({ title, onPress, prominent, disabled }: { title: string; onPress: () => void; prominent?: boolean; disabled?: boolean }) {
  const t = useTheme();
  if (!isIOS26 || !isLiquidGlassAvailable()) return <TextButton title={title} onPress={onPress} disabled={disabled} style={prominent ? { fontWeight: '600' } : undefined} />;
  return (
    <Pressable accessibilityRole="button" onPress={onPress} disabled={disabled} hitSlop={6} style={({ pressed }) => ({ opacity: disabled ? 0.4 : pressed ? 0.7 : 1 })}>
      <GlassView glassEffectStyle="regular" isInteractive style={s.capsule}>
        <Text numberOfLines={1} style={{ fontSize: 17, fontWeight: prominent ? '600' : '400', color: t.accent }}>{title}</Text>
      </GlassView>
    </Pressable>
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

export interface Anchor { x: number; y: number; width: number; height: number }

export function useDropdown() {
  const ref = useRef<ComponentRef<typeof View>>(null);
  const [anchor, setAnchor] = useStateLocal<Anchor | null>(null);
  return {
    ref,
    anchor,
    open: () => ref.current?.measureInWindow((x, y, width, height) => setAnchor({ x, y, width, height })),
    close: () => setAnchor(null),
  };
}

const ROW_HEIGHT = 48;
const SECTION_GAP = 8;

function Items({ sections, onClose, compact }: { sections: MenuItem[][]; onClose: () => void; compact?: boolean }) {
  const t = useTheme();
  return (
    <>
      {sections.map((items, i) => {
        const rows = items.map((item, j) => (
          <FormRow key={item.title} last={j === items.length - 1} disabled={item.disabled}
            onPress={() => { onClose(); item.onPress(); }} style={{ opacity: item.disabled ? 0.4 : 1, minHeight: compact ? ROW_HEIGHT : undefined }}>
            {item.icon ? <Glyph name={item.icon} size={20} color={item.destructive ? t.red : t.accent} style={{ marginRight: 12 }} /> : null}
            <Text style={{ flex: 1, fontSize: 17, color: item.destructive ? t.red : t.label }} numberOfLines={1}>{item.title}</Text>
            {item.checked ? <Glyph name="checkmark" size={20} color={t.accent} /> : null}
          </FormRow>
        ));
        return compact
          ? <View key={i} style={i > 0 ? { borderTopWidth: SECTION_GAP, borderTopColor: t.fill } : undefined}>{rows}</View>
          : <FormSection key={i}>{rows}</FormSection>;
      })}
    </>
  );
}

export function ActionMenu({ visible, title, sections, onClose, anchor }: {
  visible: boolean; title?: string; sections: MenuItem[][]; onClose: () => void; anchor?: Anchor | null;
}) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const window = useWindowDimensions();

  if (anchor !== undefined) {
    const shown = visible && anchor !== null;
    const a = anchor ?? { x: 0, y: 0, width: 0, height: 0 };
    const width = Math.min(280, window.width - 24);
    const left = Math.min(Math.max(a.x + a.width / 2 > window.width / 2 ? a.x + a.width - width : a.x, 12), window.width - width - 12);
    const count = sections.reduce((n, items) => n + items.length, 0);
    const natural = count * ROW_HEIGHT + (sections.length - 1) * SECTION_GAP;
    const below = a.y + a.height + 6;
    const roomBelow = window.height - insets.bottom - below - 12;
    const roomAbove = a.y - insets.top - 18;
    const placeBelow = roomBelow >= natural || roomBelow >= roomAbove;
    const maxHeight = Math.max(120, Math.min(natural, placeBelow ? roomBelow : roomAbove));
    const top = placeBelow ? below : a.y - 6 - maxHeight;
    return (
      <Modal visible={shown} transparent animationType="fade" statusBarTranslucent onRequestClose={onClose}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel={tr('Close menu')} />
        <View pointerEvents="box-none" style={StyleSheet.absoluteFill}>
          <View style={[s.dropdown, { top, left, width, maxHeight, backgroundColor: t.cell }]}>
            <ScrollView bounces={false}><Items sections={sections} onClose={onClose} compact /></ScrollView>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={s.backdrop} onPress={onClose} accessibilityLabel={tr('Close menu')} />
      <View style={s.sheetWrap} pointerEvents="box-none">
        <View style={[s.menu, { backgroundColor: t.groupedBackground, paddingBottom: Math.max(insets.bottom, 8) + 6 }]}>
          {title ? <Text style={[s.menuTitle, { color: t.secondaryLabel }]}>{title}</Text> : null}
          <ScrollView style={{ maxHeight: 440 }} bounces={false}><Items sections={sections} onClose={onClose} /></ScrollView>
          <View style={{ marginHorizontal: 16, marginTop: 14 }}>
            <Pressable onPress={onClose} style={[s.cancel, { backgroundColor: t.cell }]}>
              <Text style={{ fontSize: 17, fontWeight: '600', color: t.accent }}>{tr('Cancel')}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export function PickerRow<T>({ label, value, options, onChange, last, hideLabel }: {
  label: string; value: T; options: { title: string; value: T }[]; onChange: (v: T) => void; last?: boolean; hideLabel?: boolean;
}) {
  const t = useTheme();
  const current = options.find((o) => Object.is(o.value, value));
  return (
    <NativeMenu label={label} style={{ alignSelf: 'stretch' }}
      sections={[options.map((o) => ({ title: o.title, checked: Object.is(o.value, value), onPress: () => onChange(o.value) }))]}>
      <FormRow last={last}>
        {hideLabel ? null : <Text style={{ fontSize: 17, color: t.label, flex: 1 }}>{label}</Text>}
        <Text style={{ fontSize: 17, color: t.secondaryLabel, flex: hideLabel ? 1 : undefined, textAlign: hideLabel ? 'left' : 'right' }} numberOfLines={1}>{current?.title ?? ''}</Text>
        <Glyph name="chevron.up.chevron.down" size={16} color={t.tertiaryLabel} style={{ marginLeft: 6 }} />
      </FormRow>
    </NativeMenu>
  );
}

const s = StyleSheet.create({
  bar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingTop: 6, height: 60 },
  side: { width: 104 },
  capsule: { height: 40, minWidth: 40, paddingHorizontal: 18, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '600' },
  backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(0,0,0,0.35)' },
  sheetWrap: { flex: 1, justifyContent: 'flex-end' },
  menu: { borderTopLeftRadius: 16, borderTopRightRadius: 16, paddingTop: 12 },
  dropdown: { position: 'absolute', borderRadius: 16, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.22, shadowRadius: 24, shadowOffset: { width: 0, height: 8 }, elevation: 12 },
  menuTitle: { fontSize: 13, textAlign: 'center', marginBottom: 2 },
  cancel: { minHeight: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
