import { useEffect, useRef } from 'react';

const THRESHOLD_G = 2.4;
const COOLDOWN_MS = 1500;

export function useShake(onShake: () => void, enabled = true) {
  const handler = useRef(onShake);
  handler.current = onShake;
  useEffect(() => {
    if (!enabled) return;
    let accelerometer: typeof import('expo-sensors').Accelerometer | undefined;
    try {
      accelerometer = require('expo-sensors')?.Accelerometer;
    } catch {
      return;
    }
    if (!accelerometer) return;
    let last = 0;
    accelerometer.setUpdateInterval(100);
    const sub = accelerometer.addListener(({ x, y, z }) => {
      const now = Date.now();
      if (Math.sqrt(x * x + y * y + z * z) > THRESHOLD_G && now - last > COOLDOWN_MS) {
        last = now;
        handler.current();
      }
    });
    return () => sub.remove();
  }, [enabled]);
}
