import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { api } from '../src/lib/api';
import { messageTime } from '../src/lib/format';
import { useGutter } from '../src/lib/layout';
import { EmptyState } from '../src/components/EmptyState';
import { colors, radius, space, MAX_CONTENT_WIDTH } from '../src/theme';

// The notification inbox: announcements, reminders, new events and (for
// admins) RSVPs, sign-ups and reports. Opening it marks everything read.
export default function NotificationsScreen() {
  const router = useRouter();
  const gutter = useGutter(space.lg);
  const [items, setItems] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const { notifications, unread } = await api.notifications();
      setItems(notifications);
      if (unread) api.markNotificationsRead().catch(() => {});
    } catch {
      setItems((current) => current || []);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <FlatList
      style={styles.screen}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={[styles.content, gutter]}
      data={items || []}
      keyExtractor={(n) => n.id}
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
          onPress={() => item.path && router.push(item.path)}
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
        items ? <EmptyState symbol="bell" title="Nothing yet" message="Announcements, reminders and new events will appear here." /> : null
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
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: space.xl }
});
