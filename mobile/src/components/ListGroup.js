import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Icon } from './Icon';
import { colors, fonts, radius, space } from '../theme';

// Grouped list in the style of iOS Settings, used across the admin screens.
export function ListGroup({ title, footer, children }) {
  return (
    <View style={styles.wrap}>
      {title ? <Text style={styles.title}>{title}</Text> : null}
      <View style={styles.group}>{children}</View>
      {footer ? <Text style={styles.footer}>{footer}</Text> : null}
    </View>
  );
}

export function ListRow({ title, subtitle, symbol, symbolColor, left, right, onPress, destructive, chevron = Boolean(onPress) }) {
  const body = (
    <>
      {left || (symbol ? <Icon name={symbol} size={20} color={symbolColor || colors.gold} style={styles.icon} /> : null)}
      <View style={styles.text}>
        <Text style={[styles.rowTitle, destructive && styles.destructive]} numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.subtitle} numberOfLines={3}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {typeof right === 'string' || typeof right === 'number' ? <Text style={styles.right}>{right}</Text> : right}
      {chevron ? <Text style={styles.chevron}>›</Text> : null}
    </>
  );
  if (!onPress) return <View style={styles.row}>{body}</View>;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.pressed]} accessibilityRole="button">
      {body}
    </Pressable>
  );
}

// A big number with a label, for dashboard tiles.
export function StatTile({ value, label, tone, onPress }) {
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={({ pressed }) => [styles.tile, pressed && styles.pressed]} accessibilityRole={onPress ? 'button' : 'text'}>
      <Text style={[styles.tileValue, tone === 'alert' && value > 0 && styles.destructive]}>{value}</Text>
      <Text style={styles.tileLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.sm },
  title: { color: colors.gold, fontFamily: fonts.heading, fontSize: 22, marginLeft: space.xs },
  group: { backgroundColor: colors.card, borderRadius: radius.lg, overflow: 'hidden' },
  footer: { color: colors.textFaint, fontSize: 13, marginHorizontal: space.xs, lineHeight: 18 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    minHeight: 52,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border
  },
  pressed: { backgroundColor: colors.cardPressed },
  icon: { width: 24, height: 24 },
  text: { flex: 1, gap: 2 },
  rowTitle: { color: colors.text, fontSize: 16 },
  subtitle: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
  right: { color: colors.textMuted, fontSize: 15 },
  chevron: { color: colors.textFaint, fontSize: 18 },
  destructive: { color: colors.danger },
  tile: { flex: 1, backgroundColor: colors.card, borderRadius: radius.lg, padding: space.lg, gap: 2 },
  tileValue: { color: colors.text, fontSize: 30, fontWeight: '700' },
  tileLabel: { color: colors.textMuted, fontSize: 13 }
});
