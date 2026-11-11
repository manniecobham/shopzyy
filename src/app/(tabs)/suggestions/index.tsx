import { SuggestionsScreen } from '../../../features/suggestions/SuggestionsScreen';
import { useRuntime, useStoreVersion } from '../../../runtime/RuntimeProvider';

export default function SuggestionsTab() {
  const runtime = useRuntime();
  useStoreVersion();
  const household = runtime.currentHousehold;
  return household ? <SuggestionsScreen key={household.id} household={household} /> : null;
}
