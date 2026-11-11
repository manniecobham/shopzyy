// Production stand-in for ./seed (metro.config.js swaps it in): no sample data or demo identity is bundled.
export const DEMO_HOUSEHOLD_ID = '';
export const DEMO_USER_KEY = '';
export const DEMO_PROFILE = { name: '', emoji: '', colorHex: '' };
export function seedDemo(): string {
  throw new Error('Demo mode is not available in production builds.');
}
export function startDemoTour(): void {}
