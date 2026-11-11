import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { Brand } from '../../theme/theme';

/** Shown at launch while Shopzyy checks the account and opens the household. */
export function SplashView() {
  const shown = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(shown, { toValue: 1, duration: 600, easing: Easing.out(Easing.back(1.6)), useNativeDriver: true }).start();
  }, [shown]);

  const scale = shown.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] });
  const rotate = shown.interpolate({ inputRange: [0, 1], outputRange: ['-15deg', '0deg'] });
  const tagY = shown.interpolate({ inputRange: [0, 1], outputRange: [12, 0] });

  return (
    <View style={[StyleSheet.absoluteFill, s.root]} accessible accessibilityLabel={`${Brand.appName} by ${Brand.maker}. ${Brand.tagline}`}>
      <Animated.View style={[s.center, { opacity: shown }]}>
        <Animated.Text style={[s.cart, { transform: [{ scale }, { rotate }] }]}>🛒</Animated.Text>
        <Text style={s.name}>{Brand.appName}</Text>
        <Text style={s.maker}>by {Brand.maker}</Text>
      </Animated.View>
      <Animated.Text style={[s.tagline, { opacity: Animated.multiply(shown, 0.9), transform: [{ translateY: tagY }] }]}>{Brand.tagline}</Animated.Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { backgroundColor: Brand.launchColor, alignItems: 'center', justifyContent: 'center' },
  center: { alignItems: 'center', gap: 4 },
  cart: { fontSize: 72, marginBottom: 10 },
  name: { fontSize: 44, fontWeight: '800', color: '#fff' },
  maker: { fontSize: 15, fontWeight: '600', color: '#fff', opacity: 0.85 },
  tagline: { position: 'absolute', bottom: 48, fontSize: 16, fontStyle: 'italic', color: '#fff' },
});
