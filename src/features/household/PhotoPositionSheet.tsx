import { Glyph, type SymbolName } from '../../components/Glyph';
import { useMemo, useRef, useState } from 'react';
import { Image, PanResponder, StyleSheet, Text, View } from 'react-native';
import { Sheet } from '../../components/Sheet';
import { useTheme } from '../../theme/theme';
import { FocusedImage } from './HouseholdBackground';

/** Shown right after a photo is picked: choose which part of it stays visible on the list before it's applied. */
export function PhotoPositionSheet({ base64, onUse, onCancel }: { base64: string; onUse: (x: number, y: number) => void; onCancel: () => void }) {
  const t = useTheme();
  const uri = `data:image/jpeg;base64,${base64}`;
  const [focus, setFocus] = useState({ x: 0.5, y: 0.5 });
  const focusRef = useRef(focus);
  focusRef.current = focus;
  const box = useRef({ w: 1, h: 1 });
  const size = useRef({ w: 1, h: 1 });
  const start = useRef(focus);
  useMemo(() => { Image.getSize(uri, (w, h) => { size.current = { w, h }; }, () => {}); }, [uri]);

  // Dragging moves the photo with the finger, so the focal point moves the opposite way,
  // in proportion to how much of the photo is cropped off.
  const pan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderGrant: () => { start.current = focusRef.current; },
    onPanResponderMove: (_, g) => {
      const scale = Math.max(box.current.w / Math.max(size.current.w, 1), box.current.h / Math.max(size.current.h, 1));
      const overflowX = size.current.w * scale - box.current.w;
      const overflowY = size.current.h * scale - box.current.h;
      setFocus({
        x: overflowX > 0 ? Math.min(Math.max(start.current.x - g.dx / overflowX, 0), 1) : start.current.x,
        y: overflowY > 0 ? Math.min(Math.max(start.current.y - g.dy / overflowY, 0), 1) : start.current.y,
      });
    },
  }), []);

  return (
    <Sheet visible title="Position photo" onCancel={onCancel} saveTitle="Use Photo" onSave={() => onUse(focus.x, focus.y)} scroll={false}>
      <View style={{ flex: 1, alignItems: 'center', padding: 16, gap: 16 }}>
        <View style={[s.frame, { borderColor: t.separator }]} {...pan.panHandlers}
          onLayout={(e) => { box.current = { w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height }; }}
          accessibilityLabel="Preview of the list background" accessibilityHint="Drag to choose which part of the photo is shown">
          <FocusedImage uri={uri} focusX={focus.x} focusY={focus.y} />
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Glyph name="hand.draw" size={16} color={t.secondaryLabel} />
          <Text style={{ fontSize: 15, color: t.secondaryLabel }}>Drag the photo to position it</Text>
        </View>
      </View>
    </Sheet>
  );
}

const s = StyleSheet.create({ frame: { height: '88%', aspectRatio: 9 / 19.5, borderRadius: 20, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth } });
