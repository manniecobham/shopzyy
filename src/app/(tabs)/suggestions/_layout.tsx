import { Stack } from 'expo-router';
import { useTheme } from '../../../theme/theme';

/** Each tab has its own navigation stack, so it gets a native navigation bar of its own. */
export default function TabStack() {
  const t = useTheme();
  return <Stack screenOptions={{ contentStyle: { backgroundColor: t.groupedBackground } }} />;
}
