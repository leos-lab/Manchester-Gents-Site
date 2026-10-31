import { useCallback, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { useChat } from '../../../src/context/ChatContext';
import { Avatar } from '../../../src/components/Avatar';
import { EmptyState } from '../../../src/components/EmptyState';
import { Icon } from '../../../src/components/Icon';
import { messageTime } from '../../../src/lib/format';
import { colors, fonts, radius, space, MAX_CONTENT_WIDTH } from '../../../src/theme';

export default function Chats() {
  const router = useRouter();
  const { rooms, status, refreshRooms, configured } = useChat();
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refreshRooms();
    }, [refreshRooms])
  );

  return (
    <FlatList
      style={styles.list}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={styles.container}
      data={rooms}
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
        configured && status !== 'ready' && status !== 'idle' ? (
          <Text style={styles.status}>{status === 'connecting' ? 'Connecting…' : 'Offline. Reconnecting…'}</Text>
        ) : null
      }
      ItemSeparatorComponent={() => <View style={styles.separator} />}
      renderItem={({ item }) => <RoomRow room={item} onPress={() => router.push(`/chat/${item.id}`)} />}
      ListEmptyComponent={
        !configured ? (
          <EmptyState symbol="bubble.left.and.bubble.right" title="Chat isn’t set up" message="The chat server address is missing from the app’s settings." />
        ) : status === 'ready' ? (
          <EmptyState
            symbol="bubble.left.and.bubble.right"
            title="No chats yet"
            message="Reserve a spot at an event and you’ll join its group chat automatically."
          />
        ) : null
      }
    />
  );
}

function RoomRow({ room, onPress }) {
  const unread = room.unread > 0 && !room.muted;
  const preview =
    room.lastKind === 'ANNOUNCEMENT' ? `📣 ${room.lastBody || ''}` : room.lastBody || (room.kind === 'EVENT' ? 'Event chat' : 'Say hello');
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`${room.title}${unread ? `, ${room.unread} unread` : ''}`}
    >
      {room.kind === 'EVENT' ? (
        room.coverImageUrl ? (
          <Image source={{ uri: room.coverImageUrl }} style={styles.thumb} contentFit="cover" />
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
          <Text style={[styles.title, unread && styles.titleUnread]} numberOfLines={1}>{room.title}</Text>
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
