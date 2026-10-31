import { StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { colors } from '../theme';
import { initials } from '../lib/format';

// `source` overrides `uri` (e.g. a private photo that needs the app token).
export function Avatar({ name, uri, source, size = 44, ring = false }) {
  const box = { width: size, height: size, borderRadius: size / 2 };
  return (
    <View style={[styles.wrap, box, ring && styles.ring]} accessibilityLabel={name ? `${name}'s photo` : undefined}>
      {source || uri ? (
        <Image source={source || { uri }} style={box} contentFit="cover" transition={150} />
      ) : (
        <Text style={[styles.initials, { fontSize: size * 0.38 }]}>{initials(name)}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { backgroundColor: colors.steel, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  ring: { borderWidth: 2, borderColor: colors.gold },
  initials: { color: colors.gold, fontWeight: '700' }
});
