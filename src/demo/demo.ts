import Constants from 'expo-constants';
import type { ServiceEnv } from '../services/ports';

/**
 * Demo mode (the original app's `-ShopzyDemo`): a ready-made household that lives only in memory, with no
 * sign-in, sync or notifications. Build with EXPO_PUBLIC_DEMO=1. Used for screenshots and for comparing
 * screens side by side with the Swift app.
 *
 * DEVELOPMENT ONLY: it is refused in production in three places: app.config.ts fails the build if both are
 * set, metro.config.js swaps the sample data for an empty stub in production bundles, and this flag is
 * forced off when the app environment is production.
 */
export const isDemo = process.env.EXPO_PUBLIC_DEMO === '1' && Constants.expoConfig?.extra?.appEnv !== 'production';



/** The demo identity (who is "signed in" in demo mode). Only call when `isDemo` is true. */
export const demoIdentity = (): { userKey: string; profile: { name: string; emoji: string; colorHex: string } } => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const seed = require('./seed') as typeof import('./seed');
  return { userKey: seed.DEMO_USER_KEY, profile: seed.DEMO_PROFILE };
};

/** Seeds the demo household and returns its id. The data itself lives in ./seed, which production bundles don't contain. */
export function seedDemo(env: ServiceEnv): string {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return (require('./seed') as { seedDemo(e: ServiceEnv): string }).seedDemo(env);
}

/** Demo only: walk through the tabs automatically (for screenshots). */
export function startDemoTour(go: (path: string) => void): void {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  (require('./seed') as { startDemoTour(g: (p: string) => void): void }).startDemoTour(go);
}
