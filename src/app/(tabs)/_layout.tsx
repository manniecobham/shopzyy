import { router } from 'expo-router';
import { NativeTabs } from 'expo-router/native-tabs';
import { useEffect, useSyncExternalStore } from 'react';
import { DynamicColorIOS } from 'react-native';
import { SuggestionEngine } from '../../logic/SuggestionEngine';
import { itemHistory } from '../../models/itemOps';
import { isDemo, startDemoTour } from '../../demo/demo';
import { useRuntime, useStoreVersion } from '../../runtime/RuntimeProvider';
import { ShoppingListService } from '../../services/ShoppingListService';
import { t } from '../../i18n';

/**
 * The four tabs, all scoped to one household. These are the real system tabs: UITabBar on iOS (Liquid
 * Glass on iOS 26) with the same SF Symbols the original app used, and Material navigation on Android.
 */
export default function TabsLayout() {
  const runtime = useRuntime();
  useStoreVersion();
  useSyncExternalStore(runtime.subscribe, runtime.getSnapshot);

  // Once per launch, when the tabs first appear: ask for notification permission, schedule reminders, catch up on trips.
  useEffect(() => {
    if (isDemo) { startDemoTour((path) => router.navigate(path as never)); return; } // demo recordings shouldn't show the permission prompt
    void runtime.notifications.requestAuthorization().then(() => {
      ShoppingListService.refreshRestockReminders(runtime.env);
      runtime.scanActivity();
    });
  }, [runtime]);

  const household = runtime.currentHousehold;
  const suggestionCount = household
    ? new SuggestionEngine().suggestions(runtime.store.itemsIn(household.id).map(itemHistory)).length
    : 0;

  // The accent follows light/dark mode on iOS (the original app's AccentColor asset).
  const accent = DynamicColorIOS({ light: '#1E9E68', dark: '#4ACE90' });

  return (
    <NativeTabs tintColor={accent}>
      <NativeTabs.Trigger name="(list)">
        <NativeTabs.Trigger.Icon sf="checklist" md="checklist" />
        <NativeTabs.Trigger.Label>{t('List')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="suggestions">
        <NativeTabs.Trigger.Icon sf="sparkles" md="auto_awesome" />
        <NativeTabs.Trigger.Label>{t('Suggestions')}</NativeTabs.Trigger.Label>
        {suggestionCount > 0 ? <NativeTabs.Trigger.Badge>{String(suggestionCount)}</NativeTabs.Trigger.Badge> : null}
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="activity">
        <NativeTabs.Trigger.Icon sf="clock.arrow.circlepath" md="history" />
        <NativeTabs.Trigger.Label>{t('Activity')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="household">
        <NativeTabs.Trigger.Icon sf="person.2" md="group" />
        <NativeTabs.Trigger.Label>{t('Household')}</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
