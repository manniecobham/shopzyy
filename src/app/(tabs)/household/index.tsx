import { HouseholdScreen } from '../../../features/household/HouseholdScreen';
import { useAppState, useStoreVersion } from '../../../runtime/RuntimeProvider';

export default function HouseholdTab() {
  // useAppState (not just the store version) so switching household re-renders the tab.
  const runtime = useAppState();
  useStoreVersion();
  const household = runtime.currentHousehold;
  return household ? <HouseholdScreen key={household.id} household={household} /> : null;
}
