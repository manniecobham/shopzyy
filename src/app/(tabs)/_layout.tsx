import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { useSyncExternalStore } from 'react';
import { SuggestionEngine } from '../../logic/SuggestionEngine';
import { itemHistory } from '../../models/itemOps';
import { useRuntime, useStoreVersion } from '../../runtime/RuntimeProvider';
import { useTheme } from '../../theme/theme';

/** The four tabs, all scoped to one household. */
export default function TabsLayout() {
  const t = useTheme();
  const runtime = useRuntime();
  useStoreVersion();
  useSyncExternalStore(runtime.subscribe, runtime.getSnapshot);
  const household = runtime.currentHousehold;
  const suggestionCount = household
    ? new SuggestionEngine().suggestions(runtime.store.itemsIn(household.id).map(itemHistory)).length
    : 0;

  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: t.accent,
      tabBarStyle: { backgroundColor: t.isDark ? 'rgba(28,28,30,0.96)' : 'rgba(249,249,249,0.96)', borderTopColor: t.separator },
    }}>
      <Tabs.Screen name="index" options={{ title: 'List', tabBarIcon: ({ color, size }) => <Ionicons name="checkbox-outline" size={size} color={color as string} /> }} />
      <Tabs.Screen name="suggestions" options={{ title: 'Suggestions', tabBarBadge: suggestionCount > 0 ? suggestionCount : undefined, tabBarIcon: ({ color, size }) => <Ionicons name="sparkles-outline" size={size} color={color as string} /> }} />
      <Tabs.Screen name="activity" options={{ title: 'Activity', tabBarIcon: ({ color, size }) => <Ionicons name="time-outline" size={size} color={color as string} /> }} />
      <Tabs.Screen name="household" options={{ title: 'Household', tabBarIcon: ({ color, size }) => <Ionicons name="people-outline" size={size} color={color as string} /> }} />
    </Tabs>
  );
}
