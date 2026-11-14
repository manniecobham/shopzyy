import { Image } from 'react-native';

export function AppLogo({ size = 88 }: { size?: number }) {
  return <Image source={require('../../assets/icon.png')} style={{ width: size, height: size, borderRadius: size * 0.2237 }} />;
}
