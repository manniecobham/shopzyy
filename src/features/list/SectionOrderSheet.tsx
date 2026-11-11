import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, Text } from 'react-native';
import { Sheet } from '../../components/Sheet';
import { FormRow, FormSection } from '../../components/ui';
import type { ListSection } from '../../logic/listGrouping';
import { groupingTitle } from '../../models/enums';
import type { Household } from '../../models/entities';
import { useRuntime } from '../../runtime/RuntimeProvider';
import { useTheme } from '../../theme/theme';
import { householdDisplayName } from '../household/HouseholdBackground';

/**
 * Lets the household arrange the list's sections, e.g. to follow the aisles of the store they
 * use. Saved for everyone in the household. (Arrows instead of the iOS drag handles.)
 */
export function SectionOrderSheet({ household, sections, onClose }: { household: Household; sections: ListSection[]; onClose: () => void }) {
  const t = useTheme();
  const { households } = useRuntime();
  const [order, setOrder] = useState(sections.map((s) => ({ key: s.key, title: s.title })));

  const move = (from: number, by: number) => {
    const to = from + by;
    if (to < 0 || to >= order.length) return;
    const next = [...order];
    [next[from], next[to]] = [next[to], next[from]];
    setOrder(next);
  };

  return (
    <Sheet visible title={`Order by ${groupingTitle(household.groupingRaw).toLowerCase()}`} onCancel={onClose}
      onSave={() => { households.setSectionOrder(order.map((o) => o.key), household); onClose(); }}>
      <FormSection footer={`Move sections into the order you shop in. Everyone in ${householdDisplayName(household)} sees this order.`}>
        {order.map((o, i) => (
          <FormRow key={o.key} last={i === order.length - 1} style={{ gap: 8 }}>
            <Text style={{ flex: 1, fontSize: 17, color: t.label }}>{o.title}</Text>
            <Pressable onPress={() => move(i, -1)} disabled={i === 0} hitSlop={8} accessibilityLabel={`Move ${o.title} up`}><Ionicons name="chevron-up" size={22} color={i === 0 ? t.tertiaryLabel : t.accent} /></Pressable>
            <Pressable onPress={() => move(i, 1)} disabled={i === order.length - 1} hitSlop={8} accessibilityLabel={`Move ${o.title} down`}><Ionicons name="chevron-down" size={22} color={i === order.length - 1 ? t.tertiaryLabel : t.accent} /></Pressable>
          </FormRow>
        ))}
      </FormSection>
    </Sheet>
  );
}
