import { Text, View } from 'react-native';
import { useTheme } from '../../theme/theme';

/** Built in the next step. */
export default function Screen() {
  const t = useTheme();
  return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: t.groupedBackground }}><Text style={{ color: t.label }}>activity</Text></View>;
}
