import { useCallback, useState } from 'react';
import { Alert, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
// The add-to-calendar sheet lives in the legacy API since SDK 58.
import * as Calendar from 'expo-calendar/legacy';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../src/lib/api';
import { eventWhen } from '../../src/lib/format';
import { Avatar } from '../../src/components/Avatar';
import { Button } from '../../src/components/Button';
import { Chip } from '../../src/components/Chip';
import { Content } from '../../src/components/Content';
import { EmptyState } from '../../src/components/EmptyState';
import { GalleryStrip } from '../../src/components/GalleryStrip';
import { Icon } from '../../src/components/Icon';
import { colors, fonts, space, WIDE_BREAKPOINT } from '../../src/theme';

export default function EventDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [event, setEvent] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const { event: e } = await api.event(id);
      setEvent(e);
      setError(null);
    } catch (e) {
      setError(e.message);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const going = event?.myRsvp?.status === 'CONFIRMED';
  const full = event?.spotsLeft === 0 && !going;
  const closed = event?.signupDeadline && new Date(event.signupDeadline) < new Date();

  // Reserving goes through a sheet: the guidelines (and the photography notice
  // when it's on) to confirm, then an optional note for the hosts. The screen
  // reloads on return.
  const rsvp = () => router.push({ pathname: '/rsvp', params: { id } });

  const cancel = () =>
    Alert.alert('Cancel your spot?', 'You’ll also leave the event chat.', [
      { text: 'Keep my spot', style: 'cancel' },
      {
        text: 'Cancel spot',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            await api.cancelRsvp(id);
            await load();
          } catch (e) {
            Alert.alert('Couldn’t cancel', e.message);
          } finally {
            setBusy(false);
          }
        }
      }
    ]);

  const addToCalendar = async () => {
    try {
      await Calendar.createEventInCalendarAsync({
        title: `Manchester Gents: ${event.title}`,
        startDate: new Date(event.startTime),
        endDate: new Date(event.endTime || new Date(event.startTime).getTime() + 3 * 3600 * 1000),
        location: event.location || undefined,
        notes: event.subtitle || undefined
      });
    } catch (e) {
      Alert.alert('Couldn’t open your calendar', e.message);
    }
  };

  if (error && !event) {
    return (
      <View style={styles.screen}>
        <EmptyState symbol="exclamationmark.triangle" title="Event unavailable" message={error}>
          <Button title="Try again" variant="secondary" onPress={load} />
        </EmptyState>
      </View>
    );
  }
  if (!event) return <View style={styles.screen} />;

  const when = eventWhen(event.startTime, event.endTime);
  const heroHeight = Math.min(Math.max(width * 0.75, 280), width >= WIDE_BREAKPOINT ? 420 : 380);
  const accent = event.accentColor || colors.gold;
  const heading = (
    <>
      {going ? <Chip label="You’re going" tone="success" symbol="checkmark.circle.fill" /> : null}
      <Text style={styles.title}>{event.title}</Text>
      {event.subtitle ? <Text style={styles.subtitle}>{event.subtitle}</Text> : null}
    </>
  );

  return (
    <>
      <Stack.Screen options={{ title: '', headerTransparent: true }} />
      <ScrollView
        style={styles.screen}
        contentInsetAdjustmentBehavior="never"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await load(); setRefreshing(false); }} tintColor={colors.gold} />}
      >
        {event.coverImageUrl ? (
          <View style={[styles.hero, { height: heroHeight }]}>
            <Image source={{ uri: event.coverImageUrl }} style={StyleSheet.absoluteFill} contentFit="cover" transition={250} />
            <View style={styles.heroShade} />
            <Content style={styles.heroText}>{heading}</Content>
          </View>
        ) : (
          // No cover photo: a text header under the navigation bar, no image space.
          <Content style={[styles.heroText, { paddingTop: insets.top + 56, paddingBottom: 0 }]}>{heading}</Content>
        )}

        <Content style={styles.body}>
          <View style={styles.facts}>
            <Fact symbol="calendar" text={when.date} accent={accent} />
            <Fact symbol="clock" text={when.time} accent={accent} />
            {event.location ? <Fact symbol="mappin.and.ellipse" text={event.location} accent={accent} /> : null}
            {event.spotsLeft !== null && !event.isPast ? (
              <Fact symbol="person.2" text={event.spotsLeft === 0 ? 'Fully booked' : `${event.spotsLeft} spots left`} accent={accent} />
            ) : null}
          </View>

          {!event.isPast ? (
            <View style={styles.actions}>
              {going ? (
                <>
                  {event.canChat ? (
                    <Button title="Open event chat" onPress={() => router.push(`/chat/new?eventId=${encodeURIComponent(event.id)}`)} />
                  ) : null}
                  <View style={styles.row}>
                    <Button title="Add to calendar" variant="secondary" style={styles.flex} onPress={addToCalendar} />
                    <Button title="Cancel spot" variant="danger" style={styles.flex} onPress={cancel} loading={busy} />
                  </View>
                </>
              ) : closed ? (
                <Text style={styles.note}>Signups for this event have closed.</Text>
              ) : full ? (
                <Text style={styles.note}>This event is fully booked.</Text>
              ) : (
                <Button title="Reserve my spot" onPress={rsvp} loading={busy} />
              )}
            </View>
          ) : null}

          {event.hasGallery ? (
            <GalleryStrip eventId={event.id} onOpen={() => router.push(`/gallery/${event.id}`)} />
          ) : null}

          {event.description ? <Text style={styles.description}>{event.description}</Text> : null}

          {event.attendees?.length ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Who’s going · {event.attendeeCount}</Text>
              <View style={styles.attendees}>
                {event.attendees.map((m) => (
                  <Pressable key={m.id} style={styles.attendee} onPress={() => router.push(`/member/${m.id}`)} accessibilityLabel={`${m.name}'s profile`}>
                    <Avatar name={m.name} uri={m.avatarUrl} size={56} ring={m.isAdmin} />
                    <Text style={styles.attendeeName} numberOfLines={1}>{m.name}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          ) : !going && event.attendeeCount ? (
            <Text style={styles.note}>{event.attendeeCount} gents going. Reserve a spot to see who.</Text>
          ) : null}
        </Content>
      </ScrollView>
    </>
  );
}

function Fact({ symbol, text, accent }) {
  return (
    <View style={styles.fact}>
      <Icon name={symbol} size={18} color={accent} />
      <Text style={styles.factText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.navy },
  hero: { justifyContent: 'flex-end' },
  heroShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(20, 29, 41, 0.45)' },
  heroText: { padding: space.xl, gap: space.sm },
  title: { color: colors.gold, fontFamily: fonts.heading, fontSize: 40, lineHeight: 44 },
  subtitle: { color: colors.text, fontSize: 17 },
  body: { padding: space.xl, gap: space.xl, paddingBottom: 80 },
  facts: { gap: space.md },
  fact: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  factText: { color: colors.text, fontSize: 16, flexShrink: 1 },
  actions: { gap: space.md },
  row: { flexDirection: 'row', gap: space.md },
  flex: { flex: 1, paddingHorizontal: space.md },
  note: { color: colors.textMuted, fontSize: 15, lineHeight: 21 },
  description: { color: colors.text, fontSize: 16, lineHeight: 24 },
  section: { gap: space.md },
  sectionTitle: { color: colors.gold, fontSize: 13, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' },
  attendees: { flexDirection: 'row', flexWrap: 'wrap', gap: space.lg },
  attendee: { width: 64, alignItems: 'center', gap: 6 },
  attendeeName: { color: colors.textMuted, fontSize: 12, maxWidth: 64 }
});
