import { useMemo } from 'react';
import { View } from 'react-native';
import { qrRuns } from '../lib/qr';
import { AppLogo } from './AppLogo';

const QUIET = 2;
// The logo hides about 5% of the squares, well inside what the error correction can rebuild.
const LOGO_SHARE = 0.22;

// Always black on white: scanners need the contrast, in dark mode too.
export function QRCode({ value, size = 240, logo = true }: { value: string; size?: number; logo?: boolean }) {
  const { size: modules, rows } = useMemo(() => qrRuns(value), [value]);
  const total = modules + QUIET * 2;
  const cell = size / total;
  const pad = size * 0.015;
  return (
    <View style={{ width: size, height: size, backgroundColor: '#FFFFFF', borderRadius: 16 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {rows.map((runs, r) => runs.map((run) => (
        <View key={`${r}-${run.start}`} style={{ position: 'absolute', backgroundColor: '#000000', left: (run.start + QUIET) * cell, top: (r + QUIET) * cell, width: run.length * cell, height: cell + 0.5 }} />
      )))}
      {logo ? (
        <View style={{ position: 'absolute', left: (size - size * LOGO_SHARE) / 2 - pad, top: (size - size * LOGO_SHARE) / 2 - pad, padding: pad, borderRadius: size * 0.05, backgroundColor: '#FFFFFF' }}>
          <AppLogo size={size * LOGO_SHARE} />
        </View>
      ) : null}
    </View>
  );
}
