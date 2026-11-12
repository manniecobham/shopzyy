import Constants from 'expo-constants';
import type { ServiceEnv } from '../services/ports';

export const isDemo = process.env.EXPO_PUBLIC_DEMO === '1' && Constants.expoConfig?.extra?.appEnv !== 'production';

export const demoIdentity = (): { userKey: string; profile: { name: string; emoji: string; colorHex: string } } => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const seed = require('./seed') as typeof import('./seed');
  return { userKey: seed.DEMO_USER_KEY, profile: seed.DEMO_PROFILE };
};

export function seedDemo(env: ServiceEnv): string {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  return (require('./seed') as { seedDemo(e: ServiceEnv): string }).seedDemo(env);
}

export function startDemoTour(go: (path: string) => void): void {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  (require('./seed') as { startDemoTour(g: (p: string) => void): void }).startDemoTour(go);
}
