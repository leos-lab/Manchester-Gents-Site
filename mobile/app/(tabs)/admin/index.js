import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../../../src/lib/api';
import { useLoader } from '../../../src/lib/useLoader';
import { eventWhen, memberSince } from '../../../src/lib/format';
import { MemberAvatar } from '../../../src/components/MemberAvatar';
import { Button } from '../../../src/components/Button';
import { Content } from '../../../src/components/Content';
import { EmptyState } from '../../../src/components/EmptyState';
import { ListGroup, ListRow, StatTile } from '../../../src/components/ListGroup';
import { colors, space } from '../../../src/theme';

// The admin control room: what needs doing, then every admin workspace.
export default function AdminHome() {
  const router = useRouter();
  const { data, error, refreshing, refresh } = useLoader(() => api.admin.overview());

  return (
    <ScrollView
      style={styles.screen}
      contentInsetAdjustmentBehavior="automatic"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.gold} />}
    >
      <Content style={styles.content}>
        {error && !data ? (
          <EmptyState symbol="exclamationmark.triangle" title="Can’t load the dashboard" message={error}>
            <Button title="Try again" variant="secondary" onPress={refresh} />
          </EmptyState>
        ) : null}

        {data ? (
          <>
            <View style={styles.tiles}>
              <StatTile value={data.openReports} label="Reports to review" tone="alert" onPress={() => router.push('/admin/reports')} />
              <StatTile value={data.newMembers.length} label="New members (2 weeks)" onPress={() => router.push('/admin/members')} />
              <StatTile value={data.memberCount} label="Members" onPress={() => router.push('/admin/members')} />
            </View>

            {data.upcoming.length ? (
              <ListGroup title="Upcoming events">
                {data.upcoming.map((e) => (
                  <ListRow
                    key={e.id}
                    title={e.title}
                    subtitle={`${eventWhen(e.startTime).date}${e.published ? '' : ' · Draft'}`}
                    right={`${e.confirmed}${e.capacity ? `/${e.capacity}` : ''}${e.waitlisted ? ` +${e.waitlisted}` : ''}`}
                    onPress={() => router.push(`/admin/event/${e.id}`)}
                  />
                ))}
              </ListGroup>
            ) : null}

            {data.newMembers.length ? (
              <ListGroup title="New members">
                {data.newMembers.slice(0, 5).map((m) => (
                  <ListRow
                    key={m.id}
                    left={<MemberAvatar member={m} size={36} />}
                    title={m.name}
                    subtitle={`${m.instagramHandle ? `@${m.instagramHandle} · ` : ''}joined ${memberSince(m.memberSince)}`}
                    onPress={() => router.push(`/admin/member/${m.id}`)}
                  />
                ))}
              </ListGroup>
            ) : null}
          </>
        ) : null}

        <ListGroup title="Workspaces">
          <ListRow symbol="megaphone" title="Make an announcement" subtitle="Push to all members, those going, or those yet to RSVP" onPress={() => router.push('/admin/announce')} />
          <ListRow symbol="calendar" title="Events" subtitle="Drafts, published events, guest lists" onPress={() => router.push('/admin/events')} />
          <ListRow symbol="plus.circle" title="Create event" onPress={() => router.push('/admin/event-form')} />
          <ListRow symbol="person.2" title="Members" subtitle="Directory, details, placeholders" onPress={() => router.push('/admin/members')} />
          <ListRow symbol="bell.badge" title="RSVP reminders" subtitle="Who hasn’t RSVPed for the next event" onPress={() => router.push('/admin/reminders')} />
          <ListRow symbol="flag" title="Chat reports" subtitle="Remove messages, ban or dismiss" onPress={() => router.push('/admin/reports')} />
          <ListRow symbol="lock.shield" title="Security" subtitle="Log everyone out, coming soon, photography notice" onPress={() => router.push('/admin/settings')} />
        </ListGroup>
      </Content>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.navy },
  content: { padding: space.lg, gap: space.xl, paddingBottom: 140 },
  tiles: { flexDirection: 'row', gap: space.md }
});
