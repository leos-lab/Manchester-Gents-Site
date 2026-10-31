import { useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text } from 'react-native';
import { api } from '../../../src/lib/api';
import { useLoader } from '../../../src/lib/useLoader';
import { eventWhen } from '../../../src/lib/format';
import { Avatar } from '../../../src/components/Avatar';
import { Content } from '../../../src/components/Content';
import { EmptyState } from '../../../src/components/EmptyState';
import { ListGroup, ListRow } from '../../../src/components/ListGroup';
import { colors, space } from '../../../src/theme';

// Members who haven't RSVPed for the next event. A reminder goes by push to
// members with the app and by email to everyone else.
export default function AdminReminders() {
  const { data, refreshing, refresh } = useLoader(() => api.admin.reminders());
  const [sent, setSent] = useState({});

  const remind = async (member) => {
    setSent((s) => ({ ...s, [member.id]: 'Sending…' }));
    try {
      const result = await api.admin.sendReminder(data.event.id, member.id);
      setSent((s) => ({ ...s, [member.id]: result.via === 'push' ? 'Sent to app' : 'Emailed' }));
    } catch (e) {
      setSent((s) => ({ ...s, [member.id]: undefined }));
      Alert.alert('Couldn’t send', e.message);
    }
  };

  return (
    <ScrollView
      style={styles.screen}
      contentInsetAdjustmentBehavior="automatic"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.gold} />}
    >
      <Content style={styles.content}>
        {data && !data.event ? <EmptyState symbol="calendar" title="No upcoming event" message="Publish the next event to send reminders." /> : null}
        {data?.event ? (
          <>
            <Text style={styles.intro}>
              {data.members.length} {data.members.length === 1 ? 'member hasn’t' : 'members haven’t'} RSVPed for {data.event.title} on{' '}
              {eventWhen(data.event.startTime).date}.
            </Text>
            <ListGroup footer="Tap to remind. Members with the app get a push; everyone else gets an email.">
              {data.members.map((m) => (
                <ListRow
                  key={m.id}
                  left={<Avatar name={m.name} uri={m.avatarUrl} size={36} />}
                  title={m.name}
                  subtitle={`${m.eventsSignedUp} ${m.eventsSignedUp === 1 ? 'event' : 'events'} · ${m.hasApp ? 'Has the app' : 'Email'}`}
                  right={sent[m.id] || 'Remind'}
                  chevron={false}
                  onPress={sent[m.id] ? undefined : () => remind(m)}
                />
              ))}
            </ListGroup>
          </>
        ) : null}
      </Content>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.navy },
  content: { padding: space.lg, gap: space.lg, paddingBottom: 140 },
  intro: { color: colors.text, fontSize: 16, lineHeight: 23 }
});
