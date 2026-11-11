import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import ReanimatedSwipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import { MemberBadge } from '../../components/ui';
import { relativeTime } from '../../lib/format';
import { roomChoiceLabel, roomChoiceTitle } from '../../models/choices';
import type { GroceryItem } from '../../models/entities';
import { getRecipient, getRoomChoice, itemQuantityText, lastPurchase, recipientName } from '../../models/itemOps';
import { useTheme } from '../../theme/theme';

/** One item on the list: check circle, name and amount, who it's for, and who added it. Swipe right to buy, left to remove. */
export function ItemRow({ item, first, last, onBought, onEdit, onRemove }: {
  item: GroceryItem; first: boolean; last: boolean; onBought: () => void; onEdit: () => void; onRemove: () => void;
}) {
  const t = useTheme();
  const swipe = useRef<SwipeableMethods>(null);
  // Ticks the box immediately, then removes the row a beat later so the tap visibly lands first.
  const [checked, setChecked] = useState(false);

  const check = () => {
    if (checked) return;
    setChecked(true);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(onBought, 450);
  };

  const quantity = itemQuantityText(item);
  const recipient = getRecipient(item);
  const room = getRoomChoice(item);
  const subtitle = [
    item.addedBy && item.addedAt ? `Added by ${item.addedBy.name} ${relativeTime(item.addedAt)}` : null,
    lastPurchase(item) ? `last bought ${relativeTime(lastPurchase(item)!.purchasedAt)}` : null,
  ].filter(Boolean).join(', ');

  const radius = { borderTopLeftRadius: first ? 10 : 0, borderTopRightRadius: first ? 10 : 0, borderBottomLeftRadius: last ? 10 : 0, borderBottomRightRadius: last ? 10 : 0 };

  return (
    <View style={[s.wrap, radius]}>
      <ReanimatedSwipeable
        ref={swipe}
        overshootLeft={false}
        overshootRight={false}
        friction={2}
        renderLeftActions={() => <View style={[s.action, { backgroundColor: t.green, alignItems: 'flex-start' }]}><Ionicons name="checkmark" size={22} color="#fff" /><Text style={s.actionText}>Bought</Text></View>}
        renderRightActions={() => <View style={[s.action, { backgroundColor: t.red, alignItems: 'flex-end' }]}><Ionicons name="trash" size={22} color="#fff" /><Text style={s.actionText}>Remove</Text></View>}
        onSwipeableOpen={(direction) => {
          swipe.current?.close();
          if (direction === 'left') onBought(); // the left-hand action ("Bought") was revealed by swiping right
          else onRemove();
        }}
      >
        <Pressable onPress={onEdit} style={[s.row, { backgroundColor: t.cell, borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth, borderBottomColor: t.separator }]}>
          <Pressable onPress={check} hitSlop={8} accessibilityRole="button" accessibilityLabel={`Mark ${item.name} as bought`}>
            <Ionicons name={checked ? 'checkmark-circle' : 'ellipse-outline'} size={28} color={checked ? t.green : t.secondaryLabel} />
          </Pressable>

          <View style={{ flex: 1, gap: 3 }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
              <Text style={[s.name, { color: t.label }, checked && { textDecorationLine: 'line-through' }]}>{item.name}</Text>
              {quantity ? <Text style={{ fontSize: 15, color: t.secondaryLabel, fontVariant: ['tabular-nums'] }}>{quantity}</Text> : null}
            </View>
            {item.assignedTo || recipient ? (
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {item.assignedTo ? <Tag icon="cart-outline" text={`${item.assignedTo.emoji} ${item.assignedTo.name}`} label={`Assigned to ${item.assignedTo.name}`} /> : null}
                {recipient ? <Tag icon="gift-outline" text={`for ${recipientName(recipient)}`} /> : null}
              </View>
            ) : null}
            {room ? <Text style={{ fontSize: 12, color: t.secondaryLabel }} accessibilityLabel={`For the ${roomChoiceTitle(room)}`}>{roomChoiceLabel(room)}</Text> : null}
            {item.note ? <Text numberOfLines={1} style={{ fontSize: 12, color: t.secondaryLabel }}>{item.note}</Text> : null}
            {subtitle ? <Text style={{ fontSize: 11, color: t.tertiaryLabel }}>{subtitle}</Text> : null}
          </View>

          {item.addedBy ? <MemberBadge emoji={item.addedBy.emoji} colorHex={item.addedBy.colorHex} size={24} /> : null}
        </Pressable>
      </ReanimatedSwipeable>
    </View>
  );
}

function Tag({ icon, text, label }: { icon: React.ComponentProps<typeof Ionicons>['name']; text: string; label?: string }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }} accessibilityLabel={label}>
      <Ionicons name={icon} size={12} color={t.accent} />
      <Text style={{ fontSize: 12, fontWeight: '500', color: t.accent }}>{text}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { marginHorizontal: 16, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10, minHeight: 56 },
  name: { fontSize: 17, fontWeight: '500' },
  action: { width: 110, justifyContent: 'center', paddingHorizontal: 20 },
  actionText: { color: '#fff', fontSize: 12, fontWeight: '600', marginTop: 2 },
});
