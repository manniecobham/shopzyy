import { Glyph, type SymbolName } from '../../components/Glyph';
import { t as tr } from '../../i18n';
import * as Haptics from 'expo-haptics';
import { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import ReanimatedSwipeable, { type SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import { MemberBadge } from '../../components/ui';
import { relativeTime } from '../../lib/format';
import { roomChoiceLabel, roomChoiceTitle } from '../../models/choices';
import type { GroceryItem } from '../../models/entities';
import { getRecipient, getRoomChoice, itemQuantityText, lastPurchase, recipientName } from '../../models/itemOps';
import { CARD_RADIUS, useTheme } from '../../theme/theme';

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
    item.addedBy && item.addedAt ? tr('Added by {name} {when}', { name: item.addedBy.name, when: relativeTime(item.addedAt) }) : null,
    lastPurchase(item) ? tr('last bought {when}', { when: relativeTime(lastPurchase(item)!.purchasedAt) }) : null,
  ].filter(Boolean).join(', ');

  const radius = { borderTopLeftRadius: first ? CARD_RADIUS : 0, borderTopRightRadius: first ? CARD_RADIUS : 0, borderBottomLeftRadius: last ? CARD_RADIUS : 0, borderBottomRightRadius: last ? CARD_RADIUS : 0 };

  return (
    <View style={[s.wrap, radius]}>
      <ReanimatedSwipeable
        ref={swipe}
        overshootLeft={false}
        overshootRight={false}
        friction={2}
        renderLeftActions={() => <View style={[s.action, { backgroundColor: t.green, alignItems: 'flex-start' }]}><Glyph name="checkmark" size={22} color="#fff" /><Text style={s.actionText}>{tr('Bought')}</Text></View>}
        renderRightActions={() => <View style={[s.action, { backgroundColor: t.red, alignItems: 'flex-end' }]}><Glyph name="trash" size={22} color="#fff" /><Text style={s.actionText}>{tr('Remove')}</Text></View>}
        onSwipeableOpen={(direction) => {
          swipe.current?.close();
          if (direction === 'left') onBought(); // the left-hand action ("Bought") was revealed by swiping right
          else onRemove();
        }}
      >
        <Pressable onPress={onEdit} style={[s.row, { backgroundColor: t.cell }]}>
          <Pressable onPress={check} hitSlop={8} accessibilityRole="button" accessibilityLabel={tr('Mark {name} as bought', { name: item.name })}>
            <Glyph name={checked ? 'checkmark.circle.fill' : 'circle'} size={25} color={checked ? t.green : t.secondaryLabel} />
          </Pressable>

          <View style={{ flex: 1, gap: 3 }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
              <Text style={[s.name, { color: t.label }, checked && { textDecorationLine: 'line-through' }]}>{item.name}</Text>
              {quantity ? <Text style={{ fontSize: 15, color: t.secondaryLabel, fontVariant: ['tabular-nums'] }}>{quantity}</Text> : null}
            </View>
            {item.assignedTo || recipient ? (
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {item.assignedTo ? <Tag icon="cart" text={`${item.assignedTo.emoji} ${item.assignedTo.name}`} label={tr('Assigned to {name}', { name: item.assignedTo.name })} /> : null}
                {recipient ? <Tag icon="gift" text={tr('for {name}', { name: recipientName(recipient) })} /> : null}
              </View>
            ) : null}
            {room ? <Text style={{ fontSize: 12, color: t.secondaryLabel }} accessibilityLabel={tr('For the {room}', { room: roomChoiceTitle(room) })}>{roomChoiceLabel(room)}</Text> : null}
            {item.note ? <Text numberOfLines={1} style={{ fontSize: 12, color: t.secondaryLabel }}>{item.note}</Text> : null}
            {subtitle ? <Text style={{ fontSize: 11, color: t.tertiaryLabel }}>{subtitle}</Text> : null}
          </View>

          {item.addedBy ? <MemberBadge emoji={item.addedBy.emoji} colorHex={item.addedBy.colorHex} size={24} /> : null}
          {last ? null : <View pointerEvents="none" style={{ position: 'absolute', left: 57, right: 20, bottom: 0, height: StyleSheet.hairlineWidth, backgroundColor: t.separator }} />}
        </Pressable>
      </ReanimatedSwipeable>
    </View>
  );
}

function Tag({ icon, text, label }: { icon: SymbolName; text: string; label?: string }) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }} accessibilityLabel={label}>
      <Glyph name={icon} size={16} color={t.accent} />
      <Text style={{ fontSize: 12, fontWeight: '500', color: t.accent }}>{text}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { marginHorizontal: 16, overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingLeft: 16, paddingRight: 20, paddingVertical: 16, minHeight: 64 },
  name: { fontSize: 17, fontWeight: '500' },
  action: { width: 110, justifyContent: 'center', paddingHorizontal: 20 },
  actionText: { color: '#fff', fontSize: 12, fontWeight: '600', marginTop: 2 },
});
