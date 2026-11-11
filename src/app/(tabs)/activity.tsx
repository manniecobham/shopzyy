import { ActivityScreen } from '../../features/activity/ActivityScreen';
import { useRuntime, useStoreVersion } from '../../runtime/RuntimeProvider';

export default function ActivityTab() {
  const runtime = useRuntime();
  useStoreVersion();
  const household = runtime.currentHousehold;
  return household ? <ActivityScreen key={household.id} household={household} /> : null;
}
