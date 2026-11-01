import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { useChat } from '../../../src/context/ChatContext';
import { Avatar } from '../../../src/components/Avatar';
import { EmptyState } from '../../../src/components/EmptyState';
import { Button } from '../../../src/components/Button';
import { Icon } from '../../../src/components/Icon';
import { messageTime } from '../../../src/lib/format';
import { colors, fonts, radius, space, MAX_CONTENT_WIDTH } from '../../../src/theme';
import { useGutter } from '../../../src/lib/layout';
import { NotificationToolbar } from '../../../src/components/NotificationBell';

// Folders: event chats move to Archived 48 hours after the event (they're
// read-only by then); Active is everything else; Unread is anything waiting.
const FOLDERS = [
  { key: 'active', label: 'Active', match: (r) => !r.closed },
  { key: 'unread', label: 'Unread', match: (r) => r.unread > 0 && !r.muted },
  { key: 'archived', label: 'Archived', match: (r) => r.closed }
];

export default function Chats() {
  const router = useRouter();
  const { rooms, status, refreshRooms, configured } = useChat();
  const [refreshing, setRefreshing] = useState(false);
  const [folder, setFolder] = useState('active');
  const shown = rooms.filter(FOLDERS.find((f) => f.key === folder).match);
  const counts = Object.fromEntries(FOLDERS.map((f) => [f.key, rooms.filter(f.match).length]));

  useFocusEffect(
    useCallback(() => {
      refreshRooms();
    }, [refreshRooms])
  );

  const gutter = useGutter();

  return (
    <>
      <NotificationToolbar actions={[{ icon: 'square.and.pencil', label: 'New message', onPress: () => router.push('/new-message') }]} />
      <FlatList
        style={styles.list}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={[styles.container, gutter]}
        data={shown}
        keyExtractor={(r) => r.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await refreshRooms();
              setRefreshing(false);
            }}
            tintColor={colors.gold}
          />
        }
        ListHeaderComponent={
          <>
            {configured && status !== 'ready' && status !== 'idle' ? (
              <Text style={styles.status}>{status === 'connecting' ? 'Connecting…' : 'Offline. Reconnecting…'}</Text>
            ) : null}
            <View style={styles.folders} accessibilityRole="tablist">
              {FOLDERS.map((f) => (
                <Pressable
                  key={f.key}
                  onPress={() => setFolder(f.key)}
                  style={[styles.folder, folder === f.key && styles.folderActive]}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: folder === f.key }}
                >
                  <Text style={[styles.folderText, folder === f.key && styles.folderTextActive]}>
                    {f.label}
                    {f.key !== 'active' && counts[f.key] ? ` ${counts[f.key]}` : ''}
                  </Text>
                </Pressable>
              ))}
            </View>
          </>
        }
        ListFooterComponent={
          rooms.length ? (
            <Text style={styles.footer}>
              Looking for the group chat from a past social? Event chats are archived automatically 48 hours after the event.
              You’ll find their history in Archived.
            </Text>
          ) : null
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        renderItem={({ item }) => <RoomRow room={item} onPress={() => router.push(`/chat/${item.id}`)} />}
        ListEmptyComponent={
          rooms.length ? (
            <Text style={styles.emptyFolder}>
              {folder === 'unread' ? 'You’re all caught up.' : folder === 'archived' ? 'No archived chats yet.' : 'No active chats.'}
            </Text>
          ) : !configured ? (
            <EmptyState symbol="bubble.left.and.bubble.right" title="Chat isn’t set up" message="The chat server address is missing from the app’s settings." />
          ) : status === 'ready' ? (
            <EmptyState
              symbol="bubble.left.and.bubble.right"
              title="No chats yet"
              message="Reserve a spot at an event to join its group chat, or message any member."
            >
              <Button title="New message" variant="secondary" onPress={() => router.push('/new-message')} />
            </EmptyState>
          ) : null
        }
      />
    </>
  );
}

function RoomRow({ room, onPress }) {
  const unread = room.unread > 0 && !room.muted;
  const preview =
    room.lastKind === 'ANNOUNCEMENT'
      ? `📣 ${room.lastBody || ''}`
      : room.lastKind === 'LOCATION'
        ? '📍 Location'
        : room.lastKind === 'IMAGE' && !room.lastBody
          ? '📷 Photo'
          : room.lastBody ||
            (room.kind === 'COMMUNITY'
              ? 'Everyone at Manchester Gents'
              : room.kind === 'EVENT'
                ? 'Event chat'
                : room.kind === 'GROUP'
                  ? room.regarding
                    ? `About ${room.regarding.title}`
                    : 'Group chat'
                  : 'Say hello');
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`${room.title}${unread ? `, ${room.unread} unread` : ''}`}
    >
      {(room.kind === 'COMMUNITY' || room.kind === 'GROUP') && room.photoUrl ? (
        <Image source={{ uri: room.photoUrl }} style={[styles.thumb, styles.roundThumb]} contentFit="cover" />
      ) : room.kind === 'COMMUNITY' || room.kind === 'GROUP' ? (
        <View style={[styles.thumb, styles.thumbFallback]}>
          <Icon name={room.kind === 'GROUP' ? 'person.2.fill' : 'person.3.fill'} size={22} color={colors.gold} />
        </View>
      ) : room.kind === 'EVENT' ? (
        room.photoUrl || room.coverImageUrl ? (
          <Image source={{ uri: room.photoUrl || room.coverImageUrl }} style={styles.thumb} contentFit="cover" />
        ) : (
          <View style={[styles.thumb, styles.thumbFallback]}>
            <Icon name="calendar" size={22} color={colors.gold} />
          </View>
        )
      ) : (
        <Avatar name={room.other?.name} uri={room.other?.photoUrl} size={54} />
      )}
      <View style={styles.text}>
        <View style={styles.topLine}>
          <Text style={[styles.title, unread && styles.titleUnread]} numberOfLines={1}>
            {room.title}
            {room.closed ? <Text style={styles.closedTag}>  Closed</Text> : null}
          </Text>
          {room.lastMessageAt ? <Text style={styles.time}>{messageTime(room.lastMessageAt)}</Text> : null}
        </View>
        <View style={styles.topLine}>
          <Text style={[styles.preview, unread && styles.previewUnread]} numberOfLines={2}>{preview}</Text>
          {room.muted ? (
            <Icon name="bell.slash.fill" size={14} color={colors.textFaint} />
          ) : unread ? (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{room.unread > 99 ? '99+' : room.unread}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  roundThumb: { borderRadius: 27 },
  folders: { flexDirection: 'row', gap: space.sm, paddingHorizontal: space.lg, paddingVertical: space.sm },
  folder: { paddingHorizontal: space.lg, paddingVertical: 7, borderRadius: radius.pill, backgroundColor: colors.card },
  folderActive: { backgroundColor: colors.gold },
  folderText: { color: colors.textMuted, fontSize: 15, fontWeight: '600' },
  folderTextActive: { color: colors.navy },
  footer: { color: colors.textFaint, fontSize: 13, lineHeight: 18, textAlign: 'center', paddingHorizontal: space.xl, paddingVertical: space.xl },
  emptyFolder: { color: colors.textMuted, fontSize: 15, textAlign: 'center', padding: space.xl },
  closedTag: { color: colors.textFaint, fontSize: 13, fontWeight: '400' },
  list: { flex: 1, backgroundColor: colors.navy },
  container: { paddingVertical: space.sm, paddingBottom: 120, width: '100%', maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center' },
  status: { color: colors.gold, textAlign: 'center', paddingVertical: space.sm, fontSize: 13 },
  separator: { height: StyleSheet.hairlineWidth, backgroundColor: colors.border, marginLeft: 86 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space.lg, paddingVertical: space.md, gap: space.lg },
  pressed: { backgroundColor: colors.cardPressed },
  thumb: { width: 54, height: 54, borderRadius: radius.sm },
  thumbFallback: { backgroundColor: colors.steel, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, gap: 3 },
  topLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.sm },
  title: { color: colors.text, fontSize: 17, fontWeight: '600', flexShrink: 1 },
  titleUnread: { color: colors.gold },
  time: { color: colors.textFaint, fontSize: 13 },
  preview: { color: colors.textMuted, fontSize: 15, flexShrink: 1 },
  previewUnread: { color: colors.text },
  badge: { minWidth: 22, height: 22, borderRadius: 11, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  badgeText: { color: colors.navy, fontSize: 12, fontWeight: '700' }
});
