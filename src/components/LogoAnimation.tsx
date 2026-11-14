import LottieView from 'lottie-react-native';
import { Component, useEffect, useRef, useState, type ReactNode } from 'react';
import { AccessibilityInfo, ActivityIndicator, Modal, StyleSheet, Text, View } from 'react-native';
import { Brand, useTheme } from '../theme/theme';

const SOURCE = require('../../assets/animations/splash-logo.json');
const LOOP_FROM = 100;
const LOOP_TO = 150;

export type LogoMode = 'once' | 'intro-then-loop' | 'loop';

function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);
  useEffect(() => {
    let live = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((v) => { if (live) setReduce(v); });
    return () => { live = false; };
  }, []);
  return reduce;
}

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

class LottieBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

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

export function FullScreenLoader({ message }: { message?: string }) {
  const t = useTheme();
  return (
    <View style={[s.full, { backgroundColor: t.groupedBackground }]}>
      <LogoLoader size={120} label={message ?? 'Loading'} />
      {message ? <Text style={[s.message, { color: t.secondaryLabel }]}>{message}</Text> : null}
    </View>
  );
}

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

export function InlineLoading({ visible, message }: { visible: boolean; message?: string }) {
  const t = useTheme();
  if (!visible) return null;
  return (
    <View style={[StyleSheet.absoluteFill, s.backdrop]}>
      <View style={[s.card, { backgroundColor: t.cell }]}>
        <LogoLoader size={84} label={message ?? 'Loading'} />
        {message ? <Text style={[s.cardText, { color: t.label }]}>{message}</Text> : null}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  full: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 32 },
  message: { fontSize: 16, textAlign: 'center' },
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.35)' },
  card: { minWidth: 160, borderRadius: 20, padding: 20, alignItems: 'center', gap: 12 },
  cardText: { fontSize: 15, fontWeight: '600', textAlign: 'center' },
});
