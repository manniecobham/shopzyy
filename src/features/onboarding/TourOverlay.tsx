import { SafeAreaView } from 'react-native-safe-area-context';
import { useAppState } from '../../runtime/RuntimeProvider';
import { useTheme } from '../../theme/theme';
import { t as tr } from '../../i18n';
import { OnboardingTour } from './OnboardingTour';

// Shown once over the app to people who were already using it before the tour existed.
export function TourOverlay() {
  const t = useTheme();
  const runtime = useAppState();
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.background }}>
      <OnboardingTour doneTitle={tr('Done')} onDone={() => runtime.completeTour()} />
    </SafeAreaView>
  );
}
