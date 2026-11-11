import { Stack } from 'expo-router';
import { RuntimeProvider } from '../runtime/RuntimeProvider';

export default function RootLayout() {
  return (
    <RuntimeProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </RuntimeProvider>
  );
}
