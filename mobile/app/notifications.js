import { useCallback, useMemo, useRef, useState } from 'react';
import { Pressable, RefreshControl, SectionList, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { api } from '../src/lib/api';
import { messageTime } from '../src/lib/format';
import { groupByDay } from '../src/lib/dayGroups';
import { useGutter } from '../src/lib/layout';
import { EmptyState } from '../src/components/EmptyState';
import { colors, radius, space, MAX_CONTENT_WIDTH } from '../src/theme';

// The notification inbox: announcements, reminders, new events and (for
// admins) RSVPs, sign-ups and reports. Opening it marks everything read; what
// was unread stays under "New" while the screen is open, the rest is "Read".
// Both are grouped under Today, Yesterday, weekdays and older headings.
export default function NotificationsScreen() {
  const router = useRouter();
  const gutter = useGutter(space.lg);
  const [items, setItems] = useState(null);
  const [tab, setTab] = useState(null); // 'new' | 'read', chosen on first load
  const [refreshing, setRefreshing] = useState(false);
  const fresh = useRef(new Set()); // unread when they were shown

  const load = useCallback(async () => {
    try {
      const { notifications, unread } = await api.notifications();
      notifications.forEach((n) => !n.readAt && fresh.current.add(n.id));
      setItems(notifications);
      setTab((current) => current || (fresh.current.size ? 'new' : 'read'));
      if (unread) api.markNotificationsRead().catch(() => {});
    } catch {
      setItems((current) => current || []);
    }
  }, []);

  const sections = useMemo(() => {
    const list = (items || []).filter((n) => (tab === 'new') === fresh.current.has(n.id));
    return groupByDay(list, (n) => n.createdAt);
  }, [items, tab]);
  const newCount = (items || []).filter((n) => fresh.current.has(n.id)).length;

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <SectionList
      style={styles.screen}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={[styles.content, gutter]}
      sections={sections}
      keyExtractor={(n) => n.id}
      stickySectionHeadersEnabled={false}
      ListHeaderComponent={
        <View style={styles.tabs} accessibilityRole="tablist">
          {[
            ['new', newCount ? `New · ${newCount}` : 'New'],
            ['read', 'Read']
          ].map(([key, label]) => (
            <Pressable
              key={key}
              onPress={() => setTab(key)}
              style={[styles.tab, tab === key && styles.tabActive]}
              accessibilityRole="tab"
              accessibilityState={{ selected: tab === key }}
            >
              <Text style={[styles.tabText, tab === key && styles.tabTextActive]}>{label}</Text>
            </Pressable>
          ))}
        </View>
      }
      renderSectionHeader={({ section }) => <Text style={styles.sectionTitle}>{section.title}</Text>}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            await load();
            setRefreshing(false);
          }}
          tintColor={colors.gold}
        />
      }
      renderItem={({ item }) => (
        <Pressable
          onPress={() => item.path && router.push(item.path, { withAnchor: true })}
          style={({ pressed }) => [styles.row, pressed && item.path && styles.pressed]}
          accessibilityRole={item.path ? 'button' : 'text'}
        >
          {!item.readAt ? <View style={styles.dot} accessibilityLabel="Unread" /> : <View style={styles.dotSpace} />}
          <View style={styles.text}>
            <View style={styles.topLine}>
              <Text style={[styles.title, !item.readAt && styles.unread]} numberOfLines={2}>{item.title}</Text>
              <Text style={styles.time}>{messageTime(item.createdAt)}</Text>
            </View>
            <Text style={styles.body}>{item.body}</Text>
          </View>
        </Pressable>
      )}
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      ListEmptyComponent={
        items ? (
          tab === 'new' ? (
            <EmptyState symbol="checkmark.circle" title="You’re all caught up" message="Earlier notifications are under Read." />
          ) : (
            <EmptyState symbol="bell" title="Nothing yet" message="Announcements, reminders and new events will appear here." />
          )
        ) : null
      }
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.navy },
  content: { paddingVertical: space.md, width: '100%', maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center' },
  row: { flexDirection: 'row', gap: space.md, paddingVertical: space.md, paddingHorizontal: space.sm, borderRadius: radius.md },
  pressed: { backgroundColor: colors.cardPressed },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: colors.gold, marginTop: 7 },
  dotSpace: { width: 9 },
  text: { flex: 1, gap: 3 },
  topLine: { flexDirection: 'row', justifyContent: 'space-between', gap: space.sm },
  title: { color: colors.text, fontSize: 16, flexShrink: 1 },
  unread: { fontWeight: '700' },
  time: { color: colors.textFaint, fontSize: 13 },
  body: { color: colors.textMuted, fontSize: 15, lineHeight: 21 },
  tabs: { flexDirection: 'row', gap: space.sm, marginBottom: space.sm },
  tab: { paddingHorizontal: space.md, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.card },
  tabActive: { backgroundColor: colors.gold },
  tabText: { color: colors.textMuted, fontSize: 15, fontWeight: '600' },
  tabTextActive: { color: colors.navy },
  sectionTitle: { color: colors.textMuted, fontSize: 13, fontWeight: '700', letterSpacing: 0.6, textTransform: 'uppercase', marginTop: space.lg, marginBottom: space.xs, paddingHorizontal: space.sm },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: space.xl }
});
