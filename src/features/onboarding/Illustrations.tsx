import type { ReactNode } from 'react';
import { Animated, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Glyph, type SymbolName } from '../../components/Glyph';
import { useTheme } from '../../theme/theme';
import { t as tr } from '../../i18n';
import { appear, pop, track, useCycle } from './motion';

type AnimStyle = Animated.WithAnimatedValue<StyleProp<ViewStyle>>;

const AVATARS = ['#FF9500', '#5856D6', '#34C759'];

function Stage({ p, children }: { p: Animated.Value; children: ReactNode }) {
  const t = useTheme();
  // Fades the scene out and back in so the loop restarts without a jump.
  const fade = track(p, [[0, 0], [0.03, 1], [0.94, 1], [1, 0]]);
  return (
    <View
      accessibilityElementsHidden importantForAccessibility="no-hide-descendants"
      style={[s.stage, { backgroundColor: t.isDark ? 'rgba(74,206,144,0.10)' : 'rgba(30,158,104,0.10)' }]}
    >
      <Animated.View style={[s.scene, { opacity: fade }]}>{children}</Animated.View>
    </View>
  );
}

function Pill({ label, trailing, dot, style }: { label: string; trailing?: string; dot?: string; style?: AnimStyle }) {
  const t = useTheme();
  return (
    <Animated.View style={[s.pill, { backgroundColor: t.cell, borderColor: t.separator }, style]}>
      {dot ? <View style={[s.dot, { backgroundColor: dot }]} /> : <View style={[s.ring, { borderColor: t.tertiaryLabel }]} />}
      <Text style={[s.pillText, { color: t.label }]} numberOfLines={1}>{label}</Text>
      {trailing ? <Text style={[s.pillTrailing, { color: t.secondaryLabel }]}>{trailing}</Text> : null}
    </Animated.View>
  );
}

function Banner({ title, body, style }: { title: string; body: string; style?: AnimStyle }) {
  const t = useTheme();
  return (
    <Animated.View style={[s.banner, { backgroundColor: t.cell, borderColor: t.separator }, style]}>
      <View style={[s.appIcon, { backgroundColor: t.accent }]}><Glyph name="cart" size={18} color="#fff" /></View>
      <View style={{ flex: 1 }}>
        <Text style={[s.bannerTitle, { color: t.label }]} numberOfLines={1}>{title}</Text>
        <Text style={[s.bannerBody, { color: t.secondaryLabel }]} numberOfLines={1}>{body}</Text>
      </View>
      <Text style={[s.bannerTime, { color: t.tertiaryLabel }]}>{tr('now')}</Text>
    </Animated.View>
  );
}

function Phone({ children }: { children: ReactNode }) {
  const t = useTheme();
  return (
    <View style={[s.phone, { backgroundColor: t.groupedBackground, borderColor: t.separator }]}>
      <View style={[s.notch, { backgroundColor: t.separator }]} />
      <View style={{ gap: 6, padding: 8 }}>{children}</View>
    </View>
  );
}

export function ShareScene({ active }: { active: boolean }) {
  const t = useTheme();
  const p = useCycle(active);
  return (
    <Stage p={p}>
      <View style={s.row}>
        <Phone>
          <Pill label={tr('Milk')} dot={AVATARS[0]} style={appear(p, 0.08, 0.18)} />
          <Pill label={tr('Eggs')} dot={AVATARS[1]} style={appear(p, 0.74, 0.84)} />
        </Phone>
        <Animated.View style={{ opacity: track(p, [[0, 0], [0.2, 0], [0.26, 1], [0.4, 1], [0.46, 0], [0.56, 0], [0.62, 1], [0.7, 1], [0.76, 0], [1, 0]]) }}>
          <Glyph name="arrow.triangle.2.circlepath" size={26} color={t.accent} />
        </Animated.View>
        <Phone>
          <Pill label={tr('Milk')} dot={AVATARS[0]} style={appear(p, 0.3, 0.4)} />
          <Pill label={tr('Eggs')} dot={AVATARS[1]} style={appear(p, 0.56, 0.66)} />
        </Phone>
      </View>
    </Stage>
  );
}

export function AddScene({ active }: { active: boolean }) {
  const t = useTheme();
  const p = useCycle(active);
  return (
    <Stage p={p}>
      <View style={{ gap: 10, width: 250 }}>
        <Animated.View style={[s.bar, { backgroundColor: t.cell, borderColor: t.separator }, appear(p, 0.04, 0.12, 8)]}>
          <Animated.View style={{ transform: [{ scale: track(p, [[0, 1], [0.28, 1], [0.34, 1.35], [0.4, 1], [1, 1]]) }] }}>
            <Glyph name="sparkles" size={20} color={t.accent} />
          </Animated.View>
          <Text style={[s.barText, { color: t.label }]} numberOfLines={1}>{tr('2 kg rice, milk x2, eggs')}</Text>
        </Animated.View>
        <Pill label={tr('Rice')} trailing="2 kg" dot={AVATARS[0]} style={appear(p, 0.38, 0.48)} />
        <Pill label={tr('Milk')} trailing="×2" dot={AVATARS[0]} style={appear(p, 0.5, 0.6)} />
        <Pill label={tr('Eggs')} dot={AVATARS[0]} style={appear(p, 0.62, 0.72)} />
      </View>
    </Stage>
  );
}

const RECEIPT: [string, string][] = [['Milk', '1.20'], ['Eggs', '2.40'], ['Rice', '3.99']];

export function ScanScene({ active }: { active: boolean }) {
  const t = useTheme();
  const p = useCycle(active, 6000);
  const ticks = [0.28, 0.4, 0.52];
  return (
    <Stage p={p}>
      <View style={{ alignItems: 'center' }}>
        <Animated.View style={[s.receipt, { opacity: track(p, [[0, 0], [0.05, 1], [1, 1]]) }]}>
          <View style={s.receiptLine} />
          {RECEIPT.map(([name, price], i) => (
            <View key={name} style={s.receiptRow}>
              <Animated.View style={[s.tick, { backgroundColor: t.accent }, pop(p, ticks[i] - 0.06, ticks[i] + 0.04)]}>
                <Glyph name="checkmark" size={11} color="#fff" />
              </Animated.View>
              <Text style={s.receiptText}>{tr(name)}</Text>
              <Text style={s.receiptText}>{price}</Text>
            </View>
          ))}
          <View style={[s.receiptLine, { marginTop: 8, width: '60%' }]} />
          <Animated.View style={[s.scanLine, { backgroundColor: t.accent, transform: [{ translateY: track(p, [[0, 0], [0.15, 0], [0.58, 118], [0.66, 118], [1, 118]]) }], opacity: track(p, [[0, 0], [0.15, 1], [0.58, 1], [0.62, 0], [1, 0]]) }]} />
        </Animated.View>
        <Animated.View style={[s.total, { backgroundColor: t.accent }, pop(p, 0.62, 0.74)]}>
          <Text style={s.totalText}>{tr('Total')}  7.59</Text>
        </Animated.View>
      </View>
    </Stage>
  );
}

export function RemindScene({ active }: { active: boolean }) {
  const t = useTheme();
  const p = useCycle(active);
  return (
    <Stage p={p}>
      <View style={{ gap: 12, width: 270 }}>
        <Banner title="Shopzyy" body={tr('Milk is running low')} style={{ opacity: track(p, [[0, 0], [0.1, 0], [0.2, 1], [1, 1]]), transform: [{ translateY: track(p, [[0, -40], [0.1, -40], [0.2, 0], [1, 0]]) }] }} />
        <Animated.View style={[s.tapHint, { opacity: track(p, [[0, 0], [0.34, 0], [0.4, 1], [0.5, 1], [0.56, 0], [1, 0]]) }]}>
          <Glyph name="plus.circle.fill" size={28} color={t.accent} />
        </Animated.View>
        <Pill label={tr('Milk')} trailing={tr('Added to your list')} dot={AVATARS[0]} style={appear(p, 0.56, 0.68)} />
      </View>
    </Stage>
  );
}

export function TripScene({ active }: { active: boolean }) {
  const p = useCycle(active);
  const t = useTheme();
  return (
    <Stage p={p}>
      <View style={{ gap: 16, width: 270, alignItems: 'center' }}>
        <Banner title={tr('{name} finished shopping', { name: 'Ama' })} body={tr('Tap to see what was bought')}
          style={{ alignSelf: 'stretch', opacity: track(p, [[0, 0], [0.1, 0], [0.2, 1], [1, 1]]), transform: [{ translateY: track(p, [[0, -40], [0.1, -40], [0.2, 0], [1, 0]]) }] }} />
        <View style={s.row}>
          {AVATARS.map((color, i) => (
            <Animated.View key={color} style={[s.avatar, { backgroundColor: color, borderColor: t.cell }, pop(p, 0.34 + i * 0.1, 0.44 + i * 0.1)]}>
              <Glyph name="checkmark" size={18} color="#fff" />
            </Animated.View>
          ))}
        </View>
        <Animated.View style={[s.total, { backgroundColor: t.accent }, pop(p, 0.7, 0.8)]}>
          <Text style={s.totalText}>{tr('Total')}  42.50</Text>
        </Animated.View>
      </View>
    </Stage>
  );
}

export function TipsScene({ active }: { active: boolean }) {
  const t = useTheme();
  const p = useCycle(active, 5000);
  const tips: [SymbolName, string][] = [
    ['hand.draw', tr('Swipe a row to remove it')],
    ['arrow.uturn.backward', tr('Shake your phone to undo')],
    ['person.badge.plus', tr('Invite people from the Household tab')],
  ];
  return (
    <Stage p={p}>
      <View style={{ gap: 12, width: 272 }}>
        {tips.map(([icon, text], i) => (
          <Animated.View key={icon} style={[s.tip, { backgroundColor: t.cell, borderColor: t.separator }, appear(p, 0.08 + i * 0.16, 0.18 + i * 0.16)]}>
            <Glyph name={icon} size={22} color={t.accent} />
            <Text style={[s.tipText, { color: t.label }]}>{text}</Text>
          </Animated.View>
        ))}
      </View>
    </Stage>
  );
}

const s = StyleSheet.create({
  stage: { width: 310, height: 270, borderRadius: 28, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  scene: { alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  phone: { width: 112, height: 190, borderRadius: 20, borderWidth: 2, overflow: 'hidden' },
  notch: { alignSelf: 'center', width: 36, height: 4, borderRadius: 2, marginTop: 6 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 10, paddingVertical: 8 },
  pillText: { flex: 1, fontSize: 14, fontWeight: '600' },
  pillTrailing: { fontSize: 12 },
  dot: { width: 14, height: 14, borderRadius: 7 },
  ring: { width: 14, height: 14, borderRadius: 7, borderWidth: 1.5 },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14, paddingVertical: 12 },
  barText: { flex: 1, fontSize: 14 },
  receipt: { width: 168, height: 168, backgroundColor: '#FFFFFF', borderRadius: 10, padding: 14, gap: 12, overflow: 'hidden', shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 10, shadowOffset: { width: 0, height: 4 } },
  receiptLine: { height: 6, width: '80%', borderRadius: 3, backgroundColor: '#E5E5EA', alignSelf: 'center' },
  receiptRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  receiptText: { flex: 1, fontSize: 13, color: '#1C1C1E', fontWeight: '500' },
  tick: { width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  scanLine: { position: 'absolute', left: 0, right: 0, top: 24, height: 3, borderRadius: 2, shadowColor: '#1E9E68', shadowOpacity: 0.8, shadowRadius: 6, shadowOffset: { width: 0, height: 0 } },
  total: { marginTop: -14, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 8 },
  totalText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, padding: 12, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
  appIcon: { width: 34, height: 34, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  bannerTitle: { fontSize: 14, fontWeight: '700' },
  bannerBody: { fontSize: 13 },
  bannerTime: { fontSize: 12 },
  tapHint: { alignSelf: 'center' },
  avatar: { width: 44, height: 44, borderRadius: 22, borderWidth: 3, alignItems: 'center', justifyContent: 'center', marginHorizontal: -4 },
  tip: { flexDirection: 'row', alignItems: 'center', gap: 12, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14, paddingVertical: 14 },
  tipText: { flex: 1, fontSize: 15, fontWeight: '500' },
});
