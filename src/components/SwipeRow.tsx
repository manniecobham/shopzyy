import { Ionicons } from '@expo/vector-icons';
import { useRef, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import ReanimatedSwipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';

export interface SwipeAction {
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  color: string;
  onPress: () => void;
}

/** A row with tappable swipe actions on either side (SwiftUI `.swipeActions`). */
export function SwipeRow({ leading = [], trailing = [], children }: { leading?: SwipeAction[]; trailing?: SwipeAction[]; children: ReactNode }) {
  const ref = useRef<SwipeableMethods>(null);
  const render = (actions: SwipeAction[]) => (
    <View style={{ flexDirection: 'row' }}>
      {actions.map((a) => (
        <Pressable key={a.label} onPress={() => { ref.current?.close(); a.onPress(); }} style={[s.action, { backgroundColor: a.color }]} accessibilityRole="button" accessibilityLabel={a.label}>
          <Ionicons name={a.icon} size={22} color="#fff" />
          <Text style={s.text}>{a.label}</Text>
        </Pressable>
      ))}
    </View>
  );
  return (
    <ReanimatedSwipeable ref={ref} overshootLeft={false} overshootRight={false} friction={2}
      renderLeftActions={leading.length ? () => render(leading) : undefined}
      renderRightActions={trailing.length ? () => render(trailing) : undefined}>
      {children}
    </ReanimatedSwipeable>
  );
}

const s = StyleSheet.create({
  action: { width: 84, alignItems: 'center', justifyContent: 'center', gap: 2 },
  text: { color: '#fff', fontSize: 12, fontWeight: '600' },
});
