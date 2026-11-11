import { HouseholdScreen } from '../../../features/household/HouseholdScreen';
import { useRuntime, useStoreVersion } from '../../../runtime/RuntimeProvider';

export default function HouseholdTab() {
  const runtime = useRuntime();
  useStoreVersion();
  const household = runtime.currentHousehold;
  return household ? <HouseholdScreen key={household.id} household={household} /> : null;
}
