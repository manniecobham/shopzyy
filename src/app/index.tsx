import { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { HouseholdSetupView } from '../features/account/HouseholdSetupView';
import { ProfileSetupView } from '../features/account/ProfileSetupView';
import { SignInView } from '../features/account/SignInView';
import { WelcomeView } from '../features/account/WelcomeView';
import { SplashView } from '../features/shared/SplashView';
import { useAccount, useAppState, useStoreVersion } from '../runtime/RuntimeProvider';
import { AppNotice } from '../services/UserFacingError';
import { useSyncExternalStore } from 'react';
import { useTheme } from '../theme/theme';

/**
 * Walks a person through what Shopzyy needs (welcome → sign in → profile → a household), then
 * shows the tabs for the selected household. Mirrors the Swift RootView.
 */
export default function RootGate() {
  const runtime = useAppState();
  const account = useAccount();
  useStoreVersion();
  const t = useTheme();
  const notice = useSyncExternalStore(AppNotice.subscribe, AppNotice.getSnapshot) && AppNotice.current;

  // Keep the splash up briefly even when loading is instant, so it reads as a deliberate brand moment.
  const [minimumShown, setMinimumShown] = useState(false);
  useEffect(() => { const id = setTimeout(() => setMinimumShown(true), 1400); return () => clearTimeout(id); }, []);
  const showsSplash = !minimumShown || !runtime.ready || account.phase === 'loading';

  useEffect(() => {
    if (!notice) return;
    Alert.alert(notice.title, notice.detail, [{ text: 'OK', onPress: () => AppNotice.dismiss() }]);
  }, [notice]);

  const household = runtime.currentHousehold;
  let body: React.ReactNode = null;
  if (runtime.ready) {
    switch (account.phase) {
      case 'welcome': body = <WelcomeView onStart={() => account.completeWelcome()} />; break;
      case 'signIn': body = <SignInView />; break;
      case 'needsProfile': body = <ProfileSetupView />; break;
      case 'ready':
        body = household ? <MainPlaceholder name={household.name} /> : <HouseholdSetupView />;
        break;
      default: body = null;
    }
  }

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: t.background }]}>
      {body}
      {showsSplash ? <SplashView /> : null}
    </View>
  );
}

/** Replaced by the four tabs in the next step. */
function MainPlaceholder({ name }: { name: string }) {
  const t = useTheme();
  return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: t.label, fontSize: 22 }}>{name}</Text></View>;
}
