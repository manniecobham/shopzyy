import { useEffect, useRef } from 'react';
import { t } from '../../i18n';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { LogoAnimation } from '../../components/LogoAnimation';
import { Brand } from '../../theme/theme';

const LOGO_SIZE = 240;

export function SplashView({ onFinish }: { onFinish?: () => void }) {
  const wordmark = useRef(new Animated.Value(0)).current;
  const tagline = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.delay(700),
      Animated.timing(wordmark, { toValue: 1, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.timing(tagline, { toValue: 1, duration: 500, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
    ]).start();
  }, [wordmark, tagline]);

  const wordmarkY = wordmark.interpolate({ inputRange: [0, 1], outputRange: [10, 0] });
  const tagY = tagline.interpolate({ inputRange: [0, 1], outputRange: [10, 0] });

  return (
    <View style={[StyleSheet.absoluteFill, s.root]} accessible accessibilityLabel={`${Brand.appName}. ${t(Brand.tagline)}`}>
      <View style={s.center}>
        <View style={s.logo}><LogoAnimation size={LOGO_SIZE} mode="intro-then-loop" onFinish={onFinish} /></View>
        <Animated.View style={[s.titles, { opacity: wordmark, transform: [{ translateY: wordmarkY }] }]}>
          <Text style={s.name}>{Brand.appName}</Text>
        </Animated.View>
      </View>
      <Animated.Text style={[s.tagline, { opacity: Animated.multiply(tagline, 0.9), transform: [{ translateY: tagY }] }]}>{t(Brand.tagline)}</Animated.Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { backgroundColor: Brand.launchColor, alignItems: 'center', justifyContent: 'center' },
  center: { alignItems: 'center' },
  logo: { width: LOGO_SIZE, height: LOGO_SIZE, alignItems: 'center', justifyContent: 'center' },
  titles: { alignItems: 'center', marginTop: -14 },
  name: { fontSize: 44, fontWeight: '800', color: '#fff' },
  tagline: { position: 'absolute', bottom: 48, fontSize: 16, fontStyle: 'italic', color: '#fff' },
});
