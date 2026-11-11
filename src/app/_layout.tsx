import { Stack } from 'expo-router';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { Alert, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SplashView } from '../features/shared/SplashView';
import { RuntimeProvider, useAccount, useAppState, useStoreVersion } from '../runtime/RuntimeProvider';
import { AppNotice } from '../services/UserFacingError';
import { useTheme } from '../theme/theme';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <RuntimeProvider>
          <Shell />
        </RuntimeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/** Chooses between onboarding and the tabs, keeps the splash up briefly, and surfaces app-wide notices. */
function Shell() {
  const t = useTheme();
  const runtime = useAppState();
  const account = useAccount();
  useStoreVersion();
  const noticeVersion = useSyncExternalStore(AppNotice.subscribe, AppNotice.getSnapshot);

  // Keep the splash up briefly even when loading is instant, so it reads as a deliberate brand moment.
  const [minimumShown, setMinimumShown] = useState(false);
  useEffect(() => { const id = setTimeout(() => setMinimumShown(true), 1400); return () => clearTimeout(id); }, []);
  const showsSplash = !minimumShown || !runtime.ready || account.phase === 'loading';

  useEffect(() => {
    const n = AppNotice.current;
    if (n) Alert.alert(n.title, n.detail, [{ text: 'OK', onPress: () => AppNotice.dismiss() }]);
  }, [noticeVersion]);

  const inMain = runtime.ready && account.phase === 'ready' && runtime.currentHousehold !== null;

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: t.background }]}>
      <Stack screenOptions={{ headerShown: false, animation: 'none' }}>
        <Stack.Protected guard={!inMain}><Stack.Screen name="onboarding" /></Stack.Protected>
        <Stack.Protected guard={inMain}><Stack.Screen name="(tabs)" /></Stack.Protected>
        <Stack.Screen name="join/[code]" />
      </Stack>
      {showsSplash ? <SplashView /> : null}
    </View>
  );
}
