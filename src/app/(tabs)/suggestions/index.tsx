import { SuggestionsScreen } from '../../../features/suggestions/SuggestionsScreen';
import { useAppState, useStoreVersion } from '../../../runtime/RuntimeProvider';

export default function SuggestionsTab() {
  // useAppState (not just the store version) so switching household re-renders the tab.
  const runtime = useAppState();
  useStoreVersion();
  const household = runtime.currentHousehold;
  return household ? <SuggestionsScreen key={household.id} household={household} /> : null;
}
