import { Stack, type ErrorBoundaryProps } from 'expo-router';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { Alert, AppState, StyleSheet, Text, View } from 'react-native';
import { language, refreshLanguage, subscribeLanguage, t as tr } from '../i18n';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ProminentButton } from '../components/ui';
import { MigrationView } from '../features/account/MigrationView';
import { UpdateRequiredView } from '../features/shared/UpdateRequiredView';
import { SplashView } from '../features/shared/SplashView';
import { TourOverlay } from '../features/onboarding/TourOverlay';
import { RuntimeProvider, useAccount, useAppState, useStoreVersion } from '../runtime/RuntimeProvider';
import { AppLog } from '../services/AppLog';
import { AppNotice } from '../services/UserFacingError';
import { useTheme } from '../theme/theme';

export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const t = useTheme();
  useEffect(() => { AppLog.error('list', 'A screen failed to draw', error); }, [error]);
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20, padding: 32, backgroundColor: t.groupedBackground }}>
      <Text style={{ fontSize: 18, fontWeight: '600', textAlign: 'center', color: t.label }}>{tr('Something went wrong. Please try again.')}</Text>
      <View style={{ alignSelf: 'stretch' }}><ProminentButton title={tr('Try again')} onPress={() => void retry()} /></View>
    </View>
  );
}

export default function RootLayout() {
  const lang = useSyncExternalStore(subscribeLanguage, language);
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s) => { if (s === 'active') refreshLanguage(); });
    return () => sub.remove();
  }, []);
  return (
    <GestureHandlerRootView style={{ flex: 1 }} key={lang}>
      <SafeAreaProvider>
        <RuntimeProvider>
          <Shell />
        </RuntimeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function Shell() {
  const t = useTheme();
  const runtime = useAppState();
  const account = useAccount();
  useStoreVersion();
  const noticeVersion = useSyncExternalStore(AppNotice.subscribe, AppNotice.getSnapshot);

  const [animationDone, setAnimationDone] = useState(false);
  useEffect(() => { const id = setTimeout(() => setAnimationDone(true), 3500); return () => clearTimeout(id); }, []);
  const showsSplash = !animationDone || !runtime.ready || account.phase === 'loading';

  useEffect(() => {
    const n = AppNotice.current;
    if (n) Alert.alert(n.title, n.detail, [{ text: tr('OK'), onPress: () => AppNotice.dismiss() }]);
  }, [noticeVersion]);

  const migrating = !!account.uid && (runtime.migration.state === 'running' || runtime.migration.state === 'failed');
  const showsTour = runtime.tourPending && account.phase === 'ready' && !showsSplash && !migrating;
  const inMain = runtime.ready && account.phase === 'ready' && runtime.currentHousehold !== null && !migrating;

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: t.background }]}>
      <Stack screenOptions={{ headerShown: false, animation: 'none' }}>
        <Stack.Protected guard={!inMain}><Stack.Screen name="onboarding" /></Stack.Protected>
        <Stack.Protected guard={inMain}><Stack.Screen name="(tabs)" /></Stack.Protected>
        <Stack.Screen name="join/[code]" />
      </Stack>
      {migrating && !showsSplash ? <View style={StyleSheet.absoluteFill}><MigrationView /></View> : null}
      {showsTour ? <View style={StyleSheet.absoluteFill}><TourOverlay /></View> : null}
      {runtime.appConfig.updateRequired && !showsSplash ? <View style={StyleSheet.absoluteFill}><UpdateRequiredView /></View> : null}
      {showsSplash ? <SplashView onFinish={() => setAnimationDone(true)} /> : null}
    </View>
  );
}
