import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { api } from '../../../src/lib/api';
import { EventCard } from '../../../src/components/EventCard';
import { Rise } from '../../../src/components/Motion';
import { EmptyState } from '../../../src/components/EmptyState';
import { Button } from '../../../src/components/Button';
import { colors, radius, space, MAX_CONTENT_WIDTH, WIDE_BREAKPOINT } from '../../../src/theme';
import { useGutter } from '../../../src/lib/layout';

const SCOPES = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'past', label: 'Past' }
];

export default function Events() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const wide = width >= WIDE_BREAKPOINT; // iPhone Duo unfolded, iPad, wide windows
  const [scope, setScope] = useState('upcoming');
  const [data, setData] = useState({ upcoming: null, past: null });
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (which) => {
    try {
      const { events } = await api.events(which);
      setData((d) => ({ ...d, [which]: events }));
      setError(null);
    } catch (e) {
      setError(e.message);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load(scope);
    }, [load, scope])
  );

  const refresh = async () => {
    setRefreshing(true);
    await load(scope);
    setRefreshing(false);
  };

  const events = data[scope];
  const columns = wide ? 2 : 1;
  const gutter = useGutter(space.lg);

  return (
    <FlatList
      key={columns}
      style={styles.list}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={[styles.container, gutter, { maxWidth: wide ? MAX_CONTENT_WIDTH * 1.6 : MAX_CONTENT_WIDTH }]}
      data={events || []}
      numColumns={columns}
      columnWrapperStyle={columns > 1 ? styles.columns : undefined}
      keyExtractor={(e) => e.id}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.gold} />}
      ListHeaderComponent={
        <View style={styles.segment} accessibilityRole="tablist">
          {SCOPES.map((s) => (
            <Pressable
              key={s.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: scope === s.key }}
              onPress={() => setScope(s.key)}
              style={[styles.segmentItem, scope === s.key && styles.segmentActive]}
            >
              <Text style={[styles.segmentText, scope === s.key && styles.segmentTextActive]}>{s.label}</Text>
            </Pressable>
          ))}
        </View>
      }
      renderItem={({ item, index }) => (
        <Rise index={Math.min(index, 6)} style={columns > 1 ? styles.cell : styles.single}>
          <EventCard event={item} compact={scope === 'past'} onPress={() => router.push(`/event/${item.id}`)} />
        </Rise>
      )}
      ListEmptyComponent={
        error ? (
          <EmptyState symbol="wifi.exclamationmark" title="Can’t load events" message={error}>
            <Button title="Try again" variant="secondary" onPress={refresh} />
          </EmptyState>
        ) : events ? (
          <EmptyState
            symbol="calendar"
            title={scope === 'upcoming' ? 'Next social coming soon' : 'No past events yet'}
            message={scope === 'upcoming' ? 'We’ll send a notification when the next one is announced.' : undefined}
          />
        ) : null
      }
    />
  );
}

const styles = StyleSheet.create({
  list: { flex: 1, backgroundColor: colors.navy },
  container: { padding: space.lg, gap: space.lg, width: '100%', alignSelf: 'center', paddingBottom: 120 },
  columns: { gap: space.lg },
  cell: { flex: 1 },
  single: {},
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radius.pill,
    padding: 4,
    alignSelf: 'flex-start'
  },
  segmentItem: { paddingHorizontal: space.lg, paddingVertical: 8, borderRadius: radius.pill },
  segmentActive: { backgroundColor: colors.gold },
  segmentText: { color: colors.textMuted, fontSize: 15, fontWeight: '600' },
  segmentTextActive: { color: colors.navy }
});
