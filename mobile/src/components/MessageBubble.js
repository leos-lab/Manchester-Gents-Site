import { memo } from 'react';
import { Linking, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { privateImage } from '../lib/api';
import { colors, radius, space } from '../theme';
import { messageTime } from '../lib/format';
import { Avatar } from './Avatar';
import { Icon } from './Icon';

function MessageBubbleBase({ message, mine, showSender, onLongPress, onPressSender, onRetry }) {
  if (message.kind === 'ANNOUNCEMENT') {
    return (
      <Pressable onLongPress={onLongPress} style={styles.announcement} accessibilityRole="text">
        <View style={styles.announcementHeader}>
          <Icon name="megaphone.fill" size={14} color={colors.navy} />
          <Text style={styles.announcementLabel}>Announcement · {message.sender?.name || 'Manchester Gents'}</Text>
        </View>
        <Text style={styles.announcementBody}>{message.body}</Text>
        <Text style={styles.announcementTime}>{messageTime(message.createdAt)}</Text>
      </Pressable>
    );
  }

  const failed = message.status === 'failed';
  const pending = message.status === 'pending';
  return (
    <View style={[styles.row, mine ? styles.rowMine : styles.rowTheirs]}>
      {!mine ? (
        <Pressable onPress={onPressSender} style={styles.avatarSlot} accessibilityLabel={`View ${message.sender?.name || 'member'}'s profile`}>
          {showSender ? <Avatar name={message.sender?.name} uri={message.sender?.photoUrl} size={30} /> : null}
        </Pressable>
      ) : null}
      <View style={[styles.column, mine && styles.columnMine]}>
        {showSender && !mine ? (
          <Text style={styles.sender}>
            {message.sender?.name || 'Former member'}
            {message.sender?.isAdmin ? <Text style={styles.adminTag}>  ADMIN</Text> : null}
          </Text>
        ) : null}
        <Pressable
          onLongPress={onLongPress}
          onPress={failed ? onRetry : undefined}
          delayLongPress={300}
          style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs, pending && styles.pending]}
          accessibilityHint={failed ? 'Not sent. Tap to retry.' : 'Long press for options'}
        >
          {!message.deleted && message.kind === 'LOCATION' && message.location ? (
            <LocationBody location={message.location} mine={mine} />
          ) : null}
          {!message.deleted && (message.imageUrl || message.localUri) ? <ChatImage message={message} /> : null}
          {message.deleted || message.body ? (
            <Text style={[styles.body, mine && styles.bodyMine, message.deleted && styles.deleted]}>
              {message.deleted ? 'Message deleted' : message.body}
            </Text>
          ) : null}
        </Pressable>
        <Text style={[styles.time, mine && styles.timeMine, failed && styles.failed]}>
          {failed ? 'Not sent · tap to retry' : pending ? 'Sending…' : messageTime(message.createdAt)}
        </Text>
      </View>
    </View>
  );
}

// Chat photos are private: loaded through the website, which checks the viewer
// is in the chat. While sending, the local copy is shown.
function ChatImage({ message }) {
  const source = message.localUri
    ? { uri: message.localUri }
    : message.imageUrl?.startsWith('pinstripe:')
      ? privateImage(`/api/v1/chat/messages/${encodeURIComponent(message.id)}/image?v=medium`)
      : { uri: message.imageUrl };
  return <Image source={source} style={styles.image} contentFit="cover" transition={150} accessibilityLabel="Photo" />;
}

function openInMaps({ latitude, longitude, name }) {
  const label = encodeURIComponent(name || 'Shared location');
  const url =
    Platform.OS === 'ios'
      ? `https://maps.apple.com/?ll=${latitude},${longitude}&q=${label}`
      : `geo:${latitude},${longitude}?q=${latitude},${longitude}(${label})`;
  Linking.openURL(url).catch(() => {});
}

function LocationBody({ location, mine }) {
  return (
    <Pressable onPress={() => openInMaps(location)} style={styles.location} accessibilityRole="link" accessibilityLabel={`Location: ${location.name || 'shared location'}. Open in Maps`}>
      <Icon name="mappin.circle.fill" size={28} color={mine ? colors.navy : colors.gold} />
      <View style={styles.locationText}>
        <Text style={[styles.body, mine && styles.bodyMine]} numberOfLines={2}>{location.name || 'Shared location'}</Text>
        <Text style={[styles.locationHint, mine && styles.bodyMine]}>Open in Maps</Text>
      </View>
    </Pressable>
  );
}

export const MessageBubble = memo(MessageBubbleBase);

const styles = StyleSheet.create({
  image: { width: 220, height: 220, borderRadius: radius.md, marginBottom: 4 },
  location: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minWidth: 180, paddingVertical: 2 },
  locationText: { flexShrink: 1 },
  locationHint: { fontSize: 13, opacity: 0.75 },
  row: { flexDirection: 'row', paddingHorizontal: space.md, marginVertical: 2, alignItems: 'flex-end' },
  rowMine: { justifyContent: 'flex-end' },
  rowTheirs: { justifyContent: 'flex-start' },
  avatarSlot: { width: 30, marginRight: space.sm, marginBottom: 18 },
  column: { maxWidth: '78%' },
  columnMine: { alignItems: 'flex-end' },
  sender: { color: colors.gold, fontSize: 13, fontWeight: '600', marginBottom: 3, marginLeft: 4 },
  adminTag: { color: colors.textFaint, fontSize: 10, letterSpacing: 1 },
  bubble: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20 },
  bubbleMine: { backgroundColor: colors.bubbleMine, borderBottomRightRadius: 6 },
  bubbleTheirs: { backgroundColor: colors.bubbleTheirs, borderBottomLeftRadius: 6 },
  pending: { opacity: 0.6 },
  body: { color: colors.text, fontSize: 16, lineHeight: 21 },
  bodyMine: { color: colors.bubbleMineText },
  deleted: { fontStyle: 'italic', opacity: 0.6 },
  time: { color: colors.textFaint, fontSize: 11, marginTop: 3, marginHorizontal: 4 },
  timeMine: { textAlign: 'right' },
  failed: { color: colors.danger },
  announcement: {
    marginHorizontal: space.lg,
    marginVertical: space.sm,
    padding: space.lg,
    borderRadius: radius.md,
    backgroundColor: colors.gold
  },
  announcementHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  announcementLabel: { color: colors.navy, fontSize: 12, fontWeight: '700', letterSpacing: 0.5 },
  announcementBody: { color: colors.navy, fontSize: 16, lineHeight: 22, fontWeight: '500' },
  announcementTime: { color: 'rgba(28, 40, 55, 0.6)', fontSize: 11, marginTop: 6 }
});
