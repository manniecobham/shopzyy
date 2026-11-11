import LottieView from 'lottie-react-native';
import { Component, useEffect, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, ActivityIndicator, Modal, StyleSheet, Text, View } from 'react-native';
import { Brand, useTheme } from '../theme/theme';

/**
 * The animated Shopzyy logo (assets/animations/splash-logo.json, 60 fps).
 *   frames   0–100  the intro: basket pops in, stripes and handle draw, sparkle spins in
 *   frames 100–150  a seamless loop: the sparkle pulses and little stars twinkle
 */
const SOURCE = require('../../assets/animations/splash-logo.json');
const LOOP_FROM = 100;
const LOOP_TO = 150;

export type LogoMode = 'once' | 'intro-then-loop' | 'loop';

/** True when the person asked the OS to reduce motion: then the logo holds still. */
function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let live = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((v) => { if (live) setReduce(v); });
    return () => { live = false; };
  }, []);
  return reduce;
}

/**
 * The logo on a transparent background (it is white, so put it on a green surface; `LogoLoader`
 * does that for you). If the native Lottie view isn't in this build, or the file can't play, it
 * falls back to a plain spinner and still calls `onFinish`, so nothing waits on it forever.
 */
export function LogoAnimation({ size, mode = 'once', onFinish }: { size: number; mode?: LogoMode; onFinish?: () => void }) {
  const reduceMotion = useReduceMotion();
  return (
    <LottieBoundary fallback={<SpinnerFallback size={size} onFinish={onFinish} />}>
      {reduceMotion ? (
        <LottieView source={SOURCE} progress={LOOP_FROM / 151} style={{ width: size, height: size }} />
      ) : (
        <Player size={size} mode={mode} onFinish={onFinish} />
      )}
    </LottieBoundary>
  );
}

function Player({ size, mode, onFinish }: { size: number; mode: LogoMode; onFinish?: () => void }) {
  const ref = useRef<LottieView>(null);
  const [looping, setLooping] = useState(mode === 'loop');

  // Starts (or switches to) the loop section once looping is on.
  useEffect(() => { if (looping) ref.current?.play(LOOP_FROM, LOOP_TO); }, [looping]);

  return (
    <LottieView
      ref={ref}
      source={SOURCE}
      style={{ width: size, height: size }}
      resizeMode="contain"
      autoPlay={mode !== 'loop'}
      loop={looping}
      onAnimationFinish={() => {
        onFinish?.();
        if (mode === 'intro-then-loop') setLooping(true);
      }}
      onAnimationFailure={() => onFinish?.()}
    />
  );
}

function SpinnerFallback({ size, onFinish }: { size: number; onFinish?: () => void }) {
  useEffect(() => {
    const id = setTimeout(() => onFinish?.(), 1400);
    return () => clearTimeout(id);
  }, [onFinish]);
  return <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}><ActivityIndicator color="#fff" /></View>;
}

/** Catches the render error React Native throws when a native view isn't compiled into this build. */
class LottieBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

/** The logo on a brand-green tile, like the app icon: the loading indicator for anywhere on a light or dark screen. */
export function LogoLoader({ size = 96, mode = 'intro-then-loop', label = 'Loading' }: { size?: number; mode?: LogoMode; label?: string }) {
  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      accessibilityLiveRegion="polite"
      style={{ width: size, height: size, borderRadius: size * 0.225, backgroundColor: Brand.launchColor, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}
    >
      <LogoAnimation size={size} mode={mode} />
    </View>
  );
}

/** A whole screen waiting for something: the loader and a line of text. */
export function FullScreenLoader({ message }: { message?: string }) {
  const t = useTheme();
  return (
    <View style={[s.full, { backgroundColor: t.groupedBackground }]}>
      <LogoLoader size={120} label={message ?? 'Loading'} />
      {message ? <Text style={[s.message, { color: t.secondaryLabel }]}>{message}</Text> : null}
    </View>
  );
}

/** Covers the screen while an action finishes (joining a household, deleting data…). Blocks taps underneath. */
export function LoadingOverlay({ visible, message }: { visible: boolean; message?: string }) {
  const t = useTheme();
  if (!visible) return null;
  // A Modal so it sits above sheets and native pickers too.
  return (
    <Modal transparent animationType="fade" statusBarTranslucent>
      <View style={s.backdrop}>
        <View style={[s.card, { backgroundColor: t.cell }]}>
          <LogoLoader size={84} label={message ?? 'Loading'} />
          {message ? <Text style={[s.cardText, { color: t.label }]}>{message}</Text> : null}
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  full: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 32 },
  message: { fontSize: 16, textAlign: 'center' },
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.35)' },
  card: { minWidth: 160, borderRadius: 20, padding: 20, alignItems: 'center', gap: 12 },
  cardText: { fontSize: 15, fontWeight: '600', textAlign: 'center' },
});
