import { Ionicons as BrandIcons } from '@expo/vector-icons';
import { SymbolView } from 'expo-symbols';
import { Pressable, type AccessibilityRole, type StyleProp, type ViewStyle } from 'react-native';
import { useTheme } from '../theme/theme';

/**
 * Every icon in the app, by its SF Symbol name (the same symbols the original iOS app uses), with the
 * Material Symbol that stands in for it on Android. Using SF Symbols means the icons match iOS exactly,
 * including the system's own look on iOS 26.
 */
const ICONS = {
  'apple.logo': 'phone_iphone',
  'arrow.triangle.2.circlepath': 'sync',
  'arrow.up.arrow.down': 'swap_vert',
  'arrow.up.circle.fill': 'arrow_circle_up',
  'arrow.uturn.backward': 'undo',
  'bag': 'shopping_bag',
  'bell.badge': 'notifications',
  'cart': 'shopping_cart',
  'cart.badge.questionmark': 'shopping_cart',
  'checklist': 'checklist',
  'checkmark': 'check',
  'checkmark.circle.fill': 'check_circle',
  'checkmark.icloud': 'cloud_done',
  'checkmark.seal': 'verified',
  'chevron.down': 'expand_more',
  'chevron.right': 'chevron_right',
  'chevron.up': 'expand_less',
  'chevron.up.chevron.down': 'unfold_more',
  'circle': 'radio_button_unchecked',
  'clock.arrow.circlepath': 'history',
  'exclamationmark.circle.fill': 'error',
  'exclamationmark.icloud': 'cloud_off',
  'exclamationmark.triangle.fill': 'warning',
  'gearshape': 'settings',
  'gift': 'redeem',
  'hand.draw': 'swipe',
  'hand.raised': 'back_hand',
  'house': 'home',
  'icloud': 'cloud',
  'info.circle.fill': 'info',
  'line.3.horizontal.decrease.circle': 'filter_list',
  'line.3.horizontal.decrease.circle.fill': 'filter_alt',
  'moon.zzz': 'bedtime',
  'paperplane': 'send',
  'person.2': 'group',
  'person.badge.plus': 'person_add',
  'person.crop.circle': 'account_circle',
  'person.crop.circle.badge.checkmark': 'how_to_reg',
  'photo': 'image',
  'plus': 'add',
  'plus.circle.fill': 'add_circle',
  'sparkles': 'auto_awesome',
  'square.and.arrow.down': 'download',
  'square.grid.2x2': 'grid_view',
  'stethoscope': 'stethoscope',
  'tag': 'sell',
  'trash': 'delete',
  'wifi.slash': 'wifi_off',
  'xmark': 'close',
} as const;

export type SymbolName = keyof typeof ICONS;
/** Brand logos aren't SF Symbols; they come from the icon font. */
type BrandName = 'logo-google';

export function Glyph({ name, size = 22, color, style, onPress, accessibilityLabel, accessibilityRole, hitSlop, weight }: {
  name: SymbolName | BrandName;
  size?: number;
  /** Defaults to the accent colour. */
  color?: string;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  accessibilityLabel?: string;
  accessibilityRole?: AccessibilityRole;
  hitSlop?: number;
  /** SF Symbol weight (iOS), e.g. 'semibold' or 'bold'. */
  weight?: 'regular' | 'medium' | 'semibold' | 'bold';
}) {
  const t = useTheme();
  const tint = color ?? t.accent;
  const icon = name === 'logo-google'
    ? <BrandIcons name="logo-google" size={size} color={tint} style={onPress ? undefined : (style as never)} />
    : (
      <SymbolView
        name={{ ios: name, android: ICONS[name], web: ICONS[name] }}
        size={size}
        tintColor={tint}
        weight={weight}
        resizeMode="scaleAspectFit"
        style={onPress ? { width: size, height: size } : [{ width: size, height: size }, style as never]}
        accessibilityLabel={accessibilityLabel}
      />
    );
  if (!onPress) return icon;
  return (
    <Pressable onPress={onPress} hitSlop={hitSlop ?? 8} accessibilityRole={accessibilityRole ?? 'button'} accessibilityLabel={accessibilityLabel} style={style}>
      {icon}
    </Pressable>
  );
}
