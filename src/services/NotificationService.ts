import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { DayPhrase } from '../logic/DayPhrase';
import type { RestockForecast } from '../logic/SuggestionEngine';
import type { ShoppingTrip } from '../logic/ShoppingTrip';
import type { AppPreferences } from './AppPreferences';
import { StorageKeys } from './storageKeys';
import type { Notifier } from './ports';

export const NotificationIds = {
  restockCategory: 'shopzy.restock',
  tripCategory: 'shopzy.trip',
  addToListAction: 'shopzy.action.addToList',
  snoozeAction: 'shopzy.action.snooze',
  restockPrefix: 'shopzy.restock.',
  tripPrefix: 'shopzy.trip.',
} as const;

/**
 * Owns every interaction with the notification centre:
 * - shopping-trip summaries ("Ada went shopping · 6 items"), one per trip,
 * - restock reminders scheduled for 9 AM the day an item is expected to run out, with
 *   "Add to list" / "Not this week" actions.
 */
export class NotificationService implements Notifier {
  onAddToList: ((itemID: string) => void) | null = null;
  onSnooze: ((itemID: string) => void) | null = null;
  /** Called when a trip summary is tapped, to show the Activity tab. */
  onOpenActivity: (() => void) | null = null;

  /** The OS allows a limited number of pending local notifications; leave headroom. */
  private readonly maxRestockReminders = 40;
  private readonly reminderHour = 9;

  constructor(private readonly prefs: AppPreferences) {}

  private get purchaseAlertsEnabled() { return this.prefs.getBool(StorageKeys.notifyPurchases, true); }
  private get restockRemindersEnabled() { return this.prefs.getBool(StorageKeys.notifyRestock, true); }

  async configure(): Promise<void> {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
    });
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', { name: 'Shopzyy', importance: Notifications.AndroidImportance.DEFAULT });
    }
    await Notifications.setNotificationCategoryAsync(NotificationIds.restockCategory, [
      { identifier: NotificationIds.addToListAction, buttonTitle: 'Add to list', options: { opensAppToForeground: false } },
      { identifier: NotificationIds.snoozeAction, buttonTitle: 'Not this week', options: { opensAppToForeground: false } },
    ]);
    await Notifications.setNotificationCategoryAsync(NotificationIds.tripCategory, []);

    Notifications.addNotificationResponseReceivedListener((response) => {
      const content = response.notification.request.content;
      if (content.categoryIdentifier === NotificationIds.tripCategory) { this.onOpenActivity?.(); return; }
      const itemID = (content.data as { itemID?: string } | null)?.itemID;
      if (!itemID) return;
      if (response.actionIdentifier === NotificationIds.addToListAction) this.onAddToList?.(itemID);
      else if (response.actionIdentifier === NotificationIds.snoozeAction) this.onSnooze?.(itemID);
    });
  }

  /** Asks for permission the first time; returns whether notifications are allowed. */
  async requestAuthorization(): Promise<boolean> {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    if (!current.canAskAgain) return false;
    return (await Notifications.requestPermissionsAsync()).granted;
  }

  async permissionDenied(): Promise<boolean> {
    const s = await Notifications.getPermissionsAsync();
    return !s.granted && !s.canAskAgain;
  }

  /**
   * Announces a shopping trip, or updates the announcement if it grew. The request id is the trip
   * id, so a pending or delivered summary for the same trip is replaced instead of stacked. If the
   * buyer may still be shopping, delivery waits until the trip has been quiet.
   */
  async postShoppingTrip(trip: ShoppingTrip, householdName: string | null, totalText: string | null, now: Date): Promise<void> {
    if (!this.purchaseAlertsEnabled) return;
    const identifier = NotificationIds.tripPrefix + trip.id;
    const time = trip.end.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    const waitSeconds = (trip.announceAt.getTime() - now.getTime()) / 1000;
    await Notifications.cancelScheduledNotificationAsync(identifier).catch(() => {});
    await Notifications.dismissNotificationAsync(identifier).catch(() => {});
    await Notifications.scheduleNotificationAsync({
      identifier,
      content: {
        title: trip.title,
        subtitle: householdName ?? undefined,
        body: `${trip.body(3, totalText)} · ${time}`,
        sound: true,
        categoryIdentifier: NotificationIds.tripCategory,
        interruptionLevel: 'active',
      },
      trigger: waitSeconds > 1 ? { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds: Math.ceil(waitSeconds) } : null,
    });
  }

  /** Replaces all pending restock reminders with ones for the given forecasts. */
  async scheduleRestockReminders(forecasts: RestockForecast[], now: Date = new Date()): Promise<void> {
    const pending = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(pending.filter((p) => p.identifier.startsWith(NotificationIds.restockPrefix))
      .map((p) => Notifications.cancelScheduledNotificationAsync(p.identifier)));
    if (!this.restockRemindersEnabled) return;

    for (const f of forecasts.slice(0, this.maxRestockReminders)) {
      const fire = new Date(f.expectedDate.getFullYear(), f.expectedDate.getMonth(), f.expectedDate.getDate(), this.reminderHour);
      if (fire <= now) continue;
      await Notifications.scheduleNotificationAsync({
        identifier: NotificationIds.restockPrefix + f.itemID,
        content: {
          title: `Running low on ${f.name.toLowerCase()}?`,
          body: `Your household usually buys it ${DayPhrase.cadence(f.typicalIntervalDays)}.`,
          sound: true,
          categoryIdentifier: NotificationIds.restockCategory,
          data: { itemID: f.itemID },
        },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: fire },
      }).catch(() => {});
    }
  }

  async removeAll(): Promise<void> {
    await Notifications.cancelAllScheduledNotificationsAsync();
    await Notifications.dismissAllNotificationsAsync();
  }
}
