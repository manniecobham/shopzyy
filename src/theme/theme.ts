import { Platform, useColorScheme } from 'react-native';
import { tx } from '../i18n';

/** True on iOS 26+, where the system draws bars with Liquid Glass and grouped lists use larger corners. */
export const isIOS26 = Platform.OS === 'ios' && parseInt(String(Platform.Version), 10) >= 26;
/** Corner radius of grouped-list cards (SwiftUI Form / List): larger since iOS 26. */
export const CARD_RADIUS = isIOS26 ? 26 : 10;

/** Brand strings, shared with the splash and welcome screens. */
export const Brand = {
  appName: 'Shopzyy',
  maker: 'MannieDev',
  tagline: tx('Hyping your shopping experience'),
  /** Same green as the launch background so the system launch screen hands over without a jump. */
  launchColor: '#1E9E68',
} as const;

export interface Palette {
  accent: string;
  background: string;
  groupedBackground: string;
  cell: string;
  label: string;
  secondaryLabel: string;
  tertiaryLabel: string;
  separator: string;
  fill: string;
  red: string;
  orange: string;
  green: string;
  isDark: boolean;
}

// iOS system colours, so the app reads like the Swift app in both modes.
const light: Palette = {
  accent: '#1E9E68', background: '#FFFFFF', groupedBackground: '#F2F2F7', cell: '#FFFFFF',
  label: '#000000', secondaryLabel: 'rgba(60,60,67,0.6)', tertiaryLabel: 'rgba(60,60,67,0.3)',
  separator: 'rgba(60,60,67,0.29)', fill: 'rgba(120,120,128,0.12)',
  red: '#FF3B30', orange: '#FF9500', green: '#34C759', isDark: false,
};
const dark: Palette = {
  accent: '#4ACE90', background: '#000000', groupedBackground: '#000000', cell: '#1C1C1E',
  label: '#FFFFFF', secondaryLabel: 'rgba(235,235,245,0.6)', tertiaryLabel: 'rgba(235,235,245,0.3)',
  separator: 'rgba(84,84,88,0.6)', fill: 'rgba(120,120,128,0.24)',
  red: '#FF453A', orange: '#FF9F0A', green: '#30D158', isDark: true,
};

export function useTheme(): Palette {
  return useColorScheme() === 'dark' ? dark : light;
}

/** Accepts "#RRGGBB" or "RRGGBB"; falls back to gray for malformed input (Color(hex:) in Swift). */
export function colorFromHex(hex: string, alpha = 1): string {
  const digits = hex.replace(/^#+|#+$/g, '');
  if (!/^[0-9a-fA-F]{6}$/.test(digits)) return alpha === 1 ? '#8E8E93' : `rgba(142,142,147,${alpha})`;
  if (alpha === 1) return `#${digits}`;
  const v = parseInt(digits, 16);
  return `rgba(${(v >> 16) & 255},${(v >> 8) & 255},${v & 255},${alpha})`;
}
