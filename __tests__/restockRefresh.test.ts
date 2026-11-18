import { ShoppingListService } from '../src/services/ShoppingListService';
import { noopNotifier } from '../src/services/ports';
import { makeEnv } from './env';

describe('restock reminder refresh', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  test('a burst of changes reschedules the reminders once', () => {
    const scheduled = jest.fn(async () => {});
    const env = { ...makeEnv(), notifier: { ...noopNotifier, scheduleRestockReminders: scheduled } };
    for (let i = 0; i < 5; i++) ShoppingListService.refreshRestockReminders(env);
    expect(scheduled).not.toHaveBeenCalled();
    jest.advanceTimersByTime(2000);
    expect(scheduled).toHaveBeenCalledTimes(1);
  });

  test('each environment keeps its own pending refresh', () => {
    const a = jest.fn(async () => {});
    const b = jest.fn(async () => {});
    const envA = { ...makeEnv(), notifier: { ...noopNotifier, scheduleRestockReminders: a } };
    const envB = { ...makeEnv(), notifier: { ...noopNotifier, scheduleRestockReminders: b } };
    ShoppingListService.refreshRestockReminders(envA);
    ShoppingListService.refreshRestockReminders(envB);
    jest.advanceTimersByTime(2000);
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
  });
});
