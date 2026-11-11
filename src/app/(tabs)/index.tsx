import { ShoppingListScreen } from '../../features/list/ShoppingListScreen';
import { useRuntime, useStoreVersion } from '../../runtime/RuntimeProvider';

export default function ListTab() {
  const runtime = useRuntime();
  useStoreVersion();
  const household = runtime.currentHousehold;
  return household ? <ShoppingListScreen key={household.id} household={household} /> : null;
}
