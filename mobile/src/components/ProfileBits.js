import { Linking, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

// Opens the Instagram app on the member's profile, or the website if the app
// isn't installed.
export function openInstagram(instagram) {
  if (!instagram) return;
  const app = `instagram://user?username=${encodeURIComponent(instagram.handle)}`;
  Linking.canOpenURL(app)
    .then((ok) => Linking.openURL(ok ? app : instagram.url))
    .catch(() => Linking.openURL(instagram.url));
}

export function Stat({ value, label, small = false }) {
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, small && styles.statValueSmall]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stat: { alignItems: 'center', minWidth: 110 },
  statValue: { color: colors.text, fontSize: 30, fontWeight: '700' },
  statValueSmall: { fontSize: 18, paddingVertical: 7 },
  statLabel: { color: colors.textMuted, fontSize: 13, marginTop: 2 }
});
