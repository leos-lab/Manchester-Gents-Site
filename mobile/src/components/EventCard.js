import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { colors, fonts, radius, space } from '../theme';
import { eventDay } from '../lib/format';
import { Chip } from './Chip';

// Image-led card: cover photo with the date stamped on it.
export function EventCard({ event, onPress, compact = false }) {
  const day = eventDay(event.startTime);
  const accent = event.accentColor || event.primaryColor || colors.gold;
  const status =
    event.myRsvp === 'CONFIRMED'
      ? { label: 'You’re going', tone: 'success', symbol: 'checkmark.circle.fill' }
      : event.myRsvp === 'WAITLISTED'
        ? { label: 'Waitlist', tone: 'gold', symbol: 'clock' }
        : event.spotsLeft === 0
          ? { label: 'Full', tone: 'default' }
          : null;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${event.title}, ${day.weekday} ${day.day} ${day.month}${status ? `, ${status.label}` : ''}`}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={[styles.cover, compact && styles.coverCompact]}>
        {event.coverImageUrl ? (
          <Image source={{ uri: event.coverImageUrl }} style={StyleSheet.absoluteFill} contentFit="cover" transition={200} />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: event.backgroundColor || colors.steel }]} />
        )}
        <View style={styles.shade} />
        <View style={[styles.date, { borderColor: accent }]}>
          <Text style={styles.dateMonth}>{day.month.toUpperCase()}</Text>
          <Text style={styles.dateDay}>{day.day}</Text>
          <Text style={styles.dateWeekday}>{day.weekday}</Text>
        </View>
      </View>
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>{event.title}</Text>
        {event.subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{event.subtitle}</Text> : null}
        <View style={styles.meta}>
          {event.location ? <Text style={styles.location} numberOfLines={1}>{event.location}</Text> : <View />}
          {status ? <Chip label={status.label} tone={status.tone} symbol={status.symbol} /> : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius.lg, overflow: 'hidden' },
  pressed: { opacity: 0.88, transform: [{ scale: 0.99 }] },
  cover: { height: 200, justifyContent: 'flex-end' },
  coverCompact: { height: 140 },
  shade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(20, 29, 41, 0.25)' },
  date: {
    position: 'absolute',
    top: space.md,
    left: space.md,
    backgroundColor: 'rgba(20, 29, 41, 0.82)',
    borderRadius: radius.sm,
    borderWidth: 1.5,
    paddingVertical: 6,
    paddingHorizontal: 10,
    alignItems: 'center',
    minWidth: 58
  },
  dateMonth: { color: colors.gold, fontSize: 12, fontWeight: '700', letterSpacing: 1.2 },
  dateDay: { color: colors.text, fontSize: 24, fontWeight: '700' },
  dateWeekday: { color: colors.textMuted, fontSize: 12 },
  body: { padding: space.lg, gap: 4 },
  title: { color: colors.gold, fontFamily: fonts.heading, fontSize: 24 },
  subtitle: { color: colors.text, fontSize: 15 },
  meta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: space.sm, gap: space.sm },
  location: { color: colors.textMuted, fontSize: 14, flexShrink: 1 }
});
