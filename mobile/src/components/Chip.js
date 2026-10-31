import { Pressable, StyleSheet, Text } from 'react-native';
import { Icon } from './Icon';
import { colors, radius, space } from '../theme';

export function Chip({ label, symbol, onPress, tone = 'default', accessibilityLabel }) {
  const t = TONES[tone] || TONES.default;
  return (
    <Pressable
      disabled={!onPress}
      onPress={onPress}
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={accessibilityLabel || label}
      style={({ pressed }) => [styles.chip, t.container, pressed && { opacity: 0.75 }]}
    >
      {symbol ? <Icon name={symbol} size={15} color={t.text.color} style={styles.icon} /> : null}
      <Text style={[styles.label, t.text]}>{label}</Text>
    </Pressable>
  );
}

const TONES = {
  default: { container: { backgroundColor: colors.card }, text: { color: colors.text } },
  gold: { container: { backgroundColor: 'rgba(255, 212, 96, 0.16)' }, text: { color: colors.gold } },
  success: { container: { backgroundColor: 'rgba(111, 211, 155, 0.16)' }, text: { color: colors.success } }
};

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: space.md,
    paddingVertical: 7,
    borderRadius: radius.pill
  },
  icon: { width: 15, height: 15, marginRight: 6 },
  label: { fontSize: 14, fontWeight: '600' }
});
