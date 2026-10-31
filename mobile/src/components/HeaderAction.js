import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { colors } from '../theme';

// A text button for the top bar of a screen or sheet (Save, Create): always
// in view, unlike a button at the end of a long form.
export function HeaderAction({ title, onPress, busy = false, disabled = false }) {
  if (busy) return <ActivityIndicator color={colors.gold} />;
  return (
    <Pressable onPress={onPress} disabled={disabled} hitSlop={12} accessibilityRole="button" accessibilityState={{ disabled }}>
      <Text style={[styles.label, disabled && styles.disabled]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  label: { color: colors.gold, fontSize: 17, fontWeight: '600' },
  disabled: { opacity: 0.4 }
});
