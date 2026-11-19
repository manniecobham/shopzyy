import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing } from 'react-native';

export type Frames = [number, number][];

export const track = (p: Animated.Value, frames: Frames) =>
  p.interpolate({ inputRange: frames.map((f) => f[0]), outputRange: frames.map((f) => f[1]), extrapolate: 'clamp' });

export function appear(p: Animated.Value, from: number, to: number, rise = 12) {
  return {
    opacity: track(p, [[0, 0], [from, 0], [to, 1], [1, 1]]),
    transform: [{ translateY: track(p, [[0, rise], [from, rise], [to, 0], [1, 0]]) }],
  };
}

export function pop(p: Animated.Value, from: number, to: number) {
  const mid = (from + to) / 2;
  return {
    opacity: track(p, [[0, 0], [from, 0], [mid, 1], [1, 1]]),
    transform: [{ scale: track(p, [[0, 0.5], [from, 0.5], [mid, 1.18], [to, 1], [1, 1]]) }],
  };
}

export function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let live = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((v) => { if (live) setReduce(v); });
    return () => { live = false; };
  }, []);
  return reduce;
}

// One progress value, 0 to 1, drives every part of a scene. It only runs while the page is showing;
// with reduced motion it rests on the finished scene.
export function useCycle(active: boolean, duration = 5500, rest = 0.9): Animated.Value {
  const p = useRef(new Animated.Value(rest)).current;
  const reduce = useReduceMotion();
  useEffect(() => {
    if (!active || reduce) { p.setValue(rest); return; }
    p.setValue(0);
    const loop = Animated.loop(Animated.timing(p, { toValue: 1, duration, easing: Easing.linear, useNativeDriver: true }));
    loop.start();
    return () => { loop.stop(); p.setValue(rest); };
  }, [active, reduce, duration, rest, p]);
  return p;
}
