import { useMemo } from 'react';
import { View } from 'react-native';
import { qrRuns } from '../lib/qr';

const QUIET = 2;

// Always black on white: scanners need the contrast, in dark mode too.
export function QRCode({ value, size = 240 }: { value: string; size?: number }) {
  const { size: modules, rows } = useMemo(() => qrRuns(value), [value]);
  const total = modules + QUIET * 2;
  const cell = size / total;
  return (
    <View style={{ width: size, height: size, backgroundColor: '#FFFFFF', borderRadius: 16 }} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {rows.map((runs, r) => runs.map((run) => (
        <View key={`${r}-${run.start}`} style={{ position: 'absolute', backgroundColor: '#000000', left: (run.start + QUIET) * cell, top: (r + QUIET) * cell, width: run.length * cell, height: cell + 0.5 }} />
      )))}
    </View>
  );
}
