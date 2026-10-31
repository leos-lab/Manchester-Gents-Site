import { useState } from 'react';
import { ActionSheetIOS, Alert, Platform, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { api, privateImage } from '../../../../src/lib/api';
import { loadPhotos } from '../../../../src/lib/gallery';
import { useLoader } from '../../../../src/lib/useLoader';
import { eventWhen } from '../../../../src/lib/format';
import { Avatar } from '../../../../src/components/Avatar';
import { Button } from '../../../../src/components/Button';
import { Chip } from '../../../../src/components/Chip';
import { Content } from '../../../../src/components/Content';
import { ListGroup, ListRow } from '../../../../src/components/ListGroup';
import { colors, fonts, radius, space } from '../../../../src/theme';

const STATUS = { CONFIRMED: 'Going', WAITLISTED: 'Waitlist', CANCELLED: 'Cancelled' };

// One event's admin workspace: details, cover, publishing and the guest list
// with private reference photos for the door.
export default function AdminEvent() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { data, refreshing, refresh, reload } = useLoader(() => api.admin.event(id));
  const [busy, setBusy] = useState(false);

  const run = async (fn, failure) => {
    setBusy(true);
    try {
      await fn();
      await reload();
    } catch (e) {
      Alert.alert(failure, e.message);
    } finally {
      setBusy(false);
    }
  };

  if (!data) return <View style={styles.screen} />;
  const { event, attendees } = data;
  const when = eventWhen(event.startTime, event.endTime);
  const going = attendees.filter((a) => a.status === 'CONFIRMED');
  const waitlist = attendees.filter((a) => a.status === 'WAITLISTED');

  const togglePublished = () =>
    run(() => api.admin.updateEvent(event.id, { published: !event.published }), 'Couldn’t update the event');

  // Cover: pick one of the event's gallery photos, or remove it.
  const changeCover = async () => {
    let photos = [];
    try {
      const { gallery } = await api.gallery(event.id);
      photos = (await loadPhotos(gallery, 1)).photos.slice(0, 8);
    } catch {
      // No gallery yet.
    }
    const choices = [
      ...photos.map((p, i) => ({ label: `Gallery photo ${i + 1}`, url: p.full || p.url || p.thumb })),
      ...(event.coverImageUrl ? [{ label: 'Remove cover', url: null, destructive: true }] : [])
    ];
    if (!choices.length) {
      Alert.alert('No photos yet', 'Upload photos to this event’s gallery first, then choose one as the cover.');
      return;
    }
    const pick = (i) => i != null && choices[i] && run(() => api.admin.setCover(event.id, choices[i].url), 'Couldn’t change the cover');
    if (Platform.OS === 'ios') {
      const labels = [...choices.map((c) => c.label), 'Cancel'];
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: labels,
          cancelButtonIndex: labels.length - 1,
          destructiveButtonIndex: choices.findIndex((c) => c.destructive),
          title: 'Cover photo',
          message: 'Newest gallery photos first.',
          userInterfaceStyle: 'dark'
        },
        pick
      );
    } else {
      Alert.alert('Cover photo', undefined, [...choices.map((c, i) => ({ text: c.label, onPress: () => pick(i) })), { text: 'Cancel', style: 'cancel' }]);
    }
  };

  const removeGuest = (a) =>
    Alert.alert(`Remove ${a.member.name}?`, 'They’ll be taken off the guest list and out of the event chat.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => run(() => api.admin.removeGuest(event.id, a.member.id), 'Couldn’t remove guest') }
    ]);

  const deleteEvent = () =>
    Alert.alert(`Delete ${event.title}?`, 'This removes the event, its guest list and its chat. It can’t be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete event',
        style: 'destructive',
        onPress: async () => {
          try {
            await api.admin.deleteEvent(event.id);
            router.back();
          } catch (e) {
            Alert.alert('Couldn’t delete', e.message);
          }
        }
      }
    ]);

  const guest = (a) => (
    <ListRow
      key={a.member.id}
      left={
        a.member.referencePhotoUrl ? (
          <Image source={privateImage(a.member.referencePhotoUrl)} style={styles.reference} contentFit="cover" accessibilityLabel={`${a.member.name}'s reference photo`} />
        ) : (
          <Avatar name={a.member.name} uri={a.member.avatarUrl} size={48} />
        )
      }
      title={a.member.name}
      subtitle={[
        a.member.instagramHandle ? `@${a.member.instagramHandle}` : null,
        a.member.eventsAttended <= 1 ? 'First social' : `${a.member.eventsAttended} socials`,
        a.member.isPlaceholder ? 'Placeholder' : null,
        a.specialRequests ? `Note: ${a.specialRequests}` : null
      ]
        .filter(Boolean)
        .join(' · ')}
      onPress={() =>
        Alert.alert(a.member.name, STATUS[a.status], [
          { text: 'View member', onPress: () => router.push(`/admin/member/${a.member.id}`) },
          { text: 'Remove from event', style: 'destructive', onPress: () => removeGuest(a) },
          { text: 'Close', style: 'cancel' }
        ])
      }
    />
  );

  return (
    <>
      <Stack.Screen options={{ title: event.title }} />
      <ScrollView
        style={styles.screen}
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.gold} />}
      >
        <Content style={styles.content}>
          {event.coverImageUrl ? <Image source={{ uri: event.coverImageUrl }} style={styles.cover} contentFit="cover" /> : null}
          <View style={styles.header}>
            <Text style={styles.title}>{event.title}</Text>
            <Text style={styles.meta}>
              {when.date} · {when.time}
              {event.location ? `\n${event.location}` : ''}
            </Text>
            <View style={styles.chips}>
              <Chip label={event.published ? 'Published' : 'Draft'} tone={event.published ? 'success' : 'default'} />
              <Chip label={`${going.length}${event.capacity ? ` of ${event.capacity}` : ''} going`} tone="gold" />
              {waitlist.length ? <Chip label={`${waitlist.length} waitlisted`} /> : null}
            </View>
          </View>

          <View style={styles.actions}>
            <Button title="Edit details" variant="secondary" style={styles.flex} onPress={() => router.push(`/admin/event-form?id=${event.id}`)} />
            <Button title={event.published ? 'Unpublish' : 'Publish'} variant="secondary" style={styles.flex} onPress={togglePublished} loading={busy} />
          </View>
          <View style={styles.actions}>
            <Button title="Cover photo" variant="secondary" style={styles.flex} onPress={changeCover} />
            <Button title="Add guests" style={styles.flex} onPress={() => router.push(`/admin/add-guests?eventId=${event.id}`)} />
          </View>

          <ListGroup title={`Going · ${going.length}`} footer={going.length ? 'Tap a guest to view or remove them.' : undefined}>
            {going.length ? going.map(guest) : <ListRow title="No one yet" />}
          </ListGroup>
          {waitlist.length ? <ListGroup title={`Waitlist · ${waitlist.length}`}>{waitlist.map(guest)}</ListGroup> : null}

          <ListGroup>
            <ListRow title="View as members see it" onPress={() => router.push(`/event/${event.id}`)} />
            <ListRow title="Event photos" onPress={() => router.push(`/gallery/${event.id}`)} />
            <ListRow title="Delete event" destructive chevron={false} onPress={deleteEvent} />
          </ListGroup>
        </Content>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.navy },
  content: { padding: space.lg, gap: space.xl, paddingBottom: 140 },
  cover: { height: 180, borderRadius: radius.lg },
  header: { gap: space.sm },
  title: { color: colors.gold, fontFamily: fonts.heading, fontSize: 32 },
  meta: { color: colors.textMuted, fontSize: 15, lineHeight: 21 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  actions: { flexDirection: 'row', gap: space.md },
  flex: { flex: 1, paddingHorizontal: space.md },
  reference: { width: 48, height: 48, borderRadius: radius.sm }
});
