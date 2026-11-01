import { Pressable, RefreshControl, ScrollView, StyleSheet } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { api } from '../../../src/lib/api';
import { useLoader } from '../../../src/lib/useLoader';
import { eventWhen } from '../../../src/lib/format';
import { Content } from '../../../src/components/Content';
import { Icon } from '../../../src/components/Icon';
import { ListGroup, ListRow } from '../../../src/components/ListGroup';
import { colors, space } from '../../../src/theme';

// Every event, drafts included.
export default function AdminEvents() {
  const router = useRouter();
  const { data, refreshing, refresh } = useLoader(() => api.admin.events());
  const now = Date.now();
  const events = data?.events || [];
  const upcoming = events.filter((e) => new Date(e.startTime) >= now).reverse();
  const past = events.filter((e) => new Date(e.startTime) < now);

  const row = (e) => (
    <ListRow
      key={e.id}
      title={e.title}
      subtitle={`${eventWhen(e.startTime).date}${e.published ? '' : ' · Draft'}`}
      right={`${e.confirmed}${e.capacity ? `/${e.capacity}` : ''}`}
      onPress={() => router.push(`/admin/event/${e.id}`)}
    />
  );

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable onPress={() => router.push('/admin/event-form')} hitSlop={12} accessibilityRole="button" accessibilityLabel="Create event">
              <Icon name="plus" size={22} color={colors.gold} />
            </Pressable>
          )
        }}
      />
      <ScrollView
        style={styles.screen}
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.gold} />}
      >
        <Content style={styles.content}>
          {upcoming.length ? <ListGroup title="Upcoming">{upcoming.map(row)}</ListGroup> : null}
          {past.length ? <ListGroup title="Past">{past.map(row)}</ListGroup> : null}
        </Content>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.navy },
  content: { padding: space.lg, gap: space.xl, paddingBottom: 140 }
});
