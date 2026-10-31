import { View } from 'react-native';

// The Instagram glyph (rounded square, lens, flash), drawn with views since
// SF Symbols has no brand icons.
export function InstagramGlyph({ size = 15, color }) {
  const stroke = Math.max(1.5, size * 0.1);
  const lens = size * 0.46;
  return (
    <View
      style={{ width: size, height: size, borderRadius: size * 0.3, borderWidth: stroke, borderColor: color, alignItems: 'center', justifyContent: 'center' }}
      accessible={false}
    >
      <View style={{ width: lens, height: lens, borderRadius: lens / 2, borderWidth: stroke, borderColor: color }} />
      <View
        style={{
          position: 'absolute',
          top: size * 0.12,
          right: size * 0.12,
          width: stroke * 1.1,
          height: stroke * 1.1,
          borderRadius: stroke,
          backgroundColor: color
        }}
      />
    </View>
  );
}
