import { ShoppingListScreen } from '../../../features/list/ShoppingListScreen';
import { useAppState, useStoreVersion } from '../../../runtime/RuntimeProvider';

export default function ListTab() {
  // useAppState (not just the store version) so switching household re-renders the tab.
  const runtime = useAppState();
  useStoreVersion();
  const household = runtime.currentHousehold;
  return household ? <ShoppingListScreen key={household.id} household={household} /> : null;
}
