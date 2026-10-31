import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, radius, space } from '../theme';

export function Button({ title, onPress, variant = 'primary', loading = false, disabled = false, style, accessibilityHint }) {
  const v = VARIANTS[variant] || VARIANTS.primary;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityHint={accessibilityHint}
      disabled={disabled || loading}
      onPress={(e) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onPress?.(e);
      }}
      style={({ pressed }) => [
        styles.base,
        v.container,
        pressed && styles.pressed,
        (disabled || loading) && styles.disabled,
        style
      ]}
    >
      {loading ? <ActivityIndicator color={v.text.color} /> : <Text style={[styles.label, v.text]}>{title}</Text>}
    </Pressable>
  );
}

const VARIANTS = {
  primary: { container: { backgroundColor: colors.gold }, text: { color: colors.navy } },
  secondary: {
    container: { backgroundColor: colors.card, borderWidth: StyleSheet.hairlineWidth, borderColor: colors.border },
    text: { color: colors.text }
  },
  danger: { container: { backgroundColor: 'rgba(255, 107, 107, 0.14)' }, text: { color: colors.danger } },
  ghost: { container: { backgroundColor: 'transparent' }, text: { color: colors.gold } }
};

const styles = StyleSheet.create({
  base: {
    minHeight: 50,
    borderRadius: radius.pill,
    paddingHorizontal: space.xl,
    alignItems: 'center',
    justifyContent: 'center'
  },
  label: { fontSize: 17, fontWeight: '600' },
  pressed: { opacity: 0.8, transform: [{ scale: 0.985 }] },
  disabled: { opacity: 0.5 }
});
