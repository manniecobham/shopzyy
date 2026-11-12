import { Stack } from 'expo-router';
import { useTheme } from '../../../theme/theme';

export default function TabStack() {
  const t = useTheme();
  return <Stack screenOptions={{ contentStyle: { backgroundColor: t.groupedBackground } }} />;
}
