import { HouseholdSetupView } from '../features/account/HouseholdSetupView';
import { ProfileSetupView } from '../features/account/ProfileSetupView';
import { SignInView } from '../features/account/SignInView';
import { WelcomeView } from '../features/account/WelcomeView';
import { FullScreenLoader } from '../components/LogoAnimation';
import { useAccount, useAppState, useStoreVersion } from '../runtime/RuntimeProvider';

/** Walks a person through what Shopzyy needs (welcome → sign in → profile → a household). Mirrors the Swift RootView. */
export default function Onboarding() {
  const runtime = useAppState();
  const account = useAccount();
  useStoreVersion();
  if (!runtime.ready) return null;
  switch (account.phase) {
    case 'welcome': return <WelcomeView onStart={() => account.completeWelcome()} />;
    case 'signIn': return <SignInView />;
    case 'needsProfile': return <ProfileSetupView />;
    // Wait for the first households to arrive so a returning person doesn't flash the "create a household" screen.
    case 'ready': return runtime.initialSyncDone ? <HouseholdSetupView /> : <FullScreenLoader message="Getting your lists…" />;
    default: return null;
  }
}
