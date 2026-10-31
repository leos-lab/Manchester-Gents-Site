import { StyleSheet, Text, View } from 'react-native';
import { Icon } from './Icon';
import { colors, fonts, space } from '../theme';

export function EmptyState({ symbol = 'sparkles', title, message, children }) {
  return (
    <View style={styles.wrap}>
      <Icon name={symbol} size={40} color={colors.gold} style={styles.icon} />
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.message}>{message}</Text> : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', padding: space.xxl, gap: space.md },
  icon: { width: 40, height: 40 },
  title: { color: colors.gold, fontFamily: fonts.heading, fontSize: 26, textAlign: 'center' },
  message: { color: colors.textMuted, fontSize: 16, textAlign: 'center', lineHeight: 22 }
});
