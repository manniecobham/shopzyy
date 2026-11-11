import { useEffect, useState } from 'react';
import { t as tr } from '../i18n';
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useTheme } from '../theme/theme';

/** A small text prompt, the cross-platform stand-in for SwiftUI's `.alert` with a TextField. */
export function Prompt({ visible, title, message, placeholder, confirmTitle, onConfirm, onCancel }: {
  visible: boolean; title: string; message?: string; placeholder?: string; confirmTitle: string;
  onConfirm: (text: string) => void; onCancel: () => void;
}) {
  const t = useTheme();
  const [text, setText] = useState('');
  useEffect(() => { if (visible) setText(''); }, [visible]);
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <KeyboardAvoidingView style={s.wrap} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onCancel} />
        <View style={[s.box, { backgroundColor: t.cell }]}>
          <Text style={[s.title, { color: t.label }]}>{title}</Text>
          {message ? <Text style={[s.message, { color: t.secondaryLabel }]}>{message}</Text> : null}
          <TextInput autoFocus value={text} onChangeText={setText} placeholder={placeholder} placeholderTextColor={t.tertiaryLabel}
            style={[s.input, { color: t.label, backgroundColor: t.fill }]} returnKeyType="done" onSubmitEditing={() => onConfirm(text)} />
          <View style={s.buttons}>
            <Pressable style={s.btn} onPress={onCancel}><Text style={{ fontSize: 17, color: t.accent }}>{tr('Cancel')}</Text></Pressable>
            <Pressable style={s.btn} onPress={() => onConfirm(text)}><Text style={{ fontSize: 17, fontWeight: '600', color: t.accent }}>{confirmTitle}</Text></Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.4)', padding: 32 },
  box: { width: '100%', maxWidth: 320, borderRadius: 14, padding: 18, gap: 10 },
  title: { fontSize: 17, fontWeight: '600', textAlign: 'center' },
  message: { fontSize: 13, textAlign: 'center' },
  input: { borderRadius: 8, paddingHorizontal: 10, height: 38, fontSize: 17 },
  buttons: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 6 },
  btn: { paddingVertical: 8, paddingHorizontal: 12 },
});
