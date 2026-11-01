import { Platform } from 'react-native';
import { SymbolView } from 'expo-symbols';

// SF Symbols on iOS; the nearest Material Symbol on Android. Every SF Symbol
// the app uses needs an entry here, or it's blank on Android.
export const MATERIAL = {
  'arrow.up': 'arrow_upward',
  bell: 'notifications',
  'bell.badge': 'notifications_active',
  'bell.slash': 'notifications_off',
  'bell.slash.fill': 'notifications_off',
  'bubble.left.and.bubble.right': 'forum',
  'bubble.left.and.exclamationmark.bubble.right': 'chat_error',
  calendar: 'calendar_today',
  camera: 'photo_camera',
  checkmark: 'check',
  'checkmark.bubble': 'mark_chat_read',
  'checkmark.circle': 'check_circle',
  'checkmark.circle.fill': 'check_circle',
  'checkmark.seal': 'verified',
  'checkmark.seal.fill': 'verified',
  'chevron.right': 'chevron_right',
  clock: 'schedule',
  envelope: 'mail',
  'exclamationmark.triangle': 'warning',
  flag: 'flag',
  'flag.fill': 'flag',
  'hand.wave': 'waving_hand',
  'house.fill': 'home',
  'info.circle': 'info',
  key: 'key',
  lock: 'lock',
  'lock.shield': 'admin_panel_settings',
  'mappin.and.ellipse': 'location_on',
  'mappin.circle.fill': 'location_on',
  megaphone: 'campaign',
  'megaphone.fill': 'campaign',
  pencil: 'edit',
  'person.2': 'group',
  'person.2.fill': 'group',
  'person.3.fill': 'groups',
  'person.badge.plus': 'person_add',
  'person.crop.circle': 'account_circle',
  'person.crop.circle.badge.exclamationmark': 'no_accounts',
  phone: 'call',
  'photo.on.rectangle': 'photo_library',
  'photo.on.rectangle.angled': 'photo_library',
  plus: 'add',
  'plus.circle': 'add_circle',
  'plus.circle.fill': 'add_circle',
  sparkles: 'auto_awesome',
  'square.and.arrow.down': 'download',
  'square.and.arrow.up': 'share',
  'square.and.pencil': 'edit_square',
  'star.fill': 'star',
  'text.bubble': 'sms',
  'wifi.exclamationmark': 'wifi_off',
  'xmark.circle.fill': 'cancel'
};

export function Icon({ name, size = 18, color, style }) {
  const android = MATERIAL[name];
  if (Platform.OS === 'android' && !android) {
    if (__DEV__) console.warn(`Icon: no Material Symbol for "${name}"; add one to MATERIAL in src/components/Icon.js`);
    return null;
  }
  return <SymbolView name={{ ios: name, android }} size={size} tintColor={color} style={[{ width: size, height: size }, style]} />;
}
