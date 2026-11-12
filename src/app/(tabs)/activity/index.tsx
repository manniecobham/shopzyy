import { ActivityScreen } from '../../../features/activity/ActivityScreen';
import { useAppState, useStoreVersion } from '../../../runtime/RuntimeProvider';

export default function ActivityTab() {
  // useAppState (not just the store version) so switching household re-renders the tab.
  const runtime = useAppState();
  useStoreVersion();
  const household = runtime.currentHousehold;
  return household ? <ActivityScreen key={household.id} household={household} /> : null;
}
