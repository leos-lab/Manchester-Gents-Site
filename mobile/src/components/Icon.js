import { Platform } from 'react-native';
import { SymbolView } from 'expo-symbols';

// SF Symbols on iOS. Android has no SF Symbols, so decorative icons are
// skipped there (text labels always carry the meaning).
export function Icon({ name, size = 18, color, style }) {
  if (Platform.OS !== 'ios') return null;
  return <SymbolView name={name} size={size} tintColor={color} style={[{ width: size, height: size }, style]} />;
}
