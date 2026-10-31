import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from 'react-native';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { COMPATIBLE_PHOTOS } from '../src/lib/filePart';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { useChat } from '../../src/context/ChatContext';
import { api } from '../../src/lib/api';
import { Avatar } from '../../src/components/Avatar';
import { useAuth } from '../../src/context/AuthContext';
import { setActiveRoom } from '../../src/lib/push';
import { dayDivider } from '../../src/lib/format';
import { MessageBubble } from '../../src/components/MessageBubble';
import { EmptyState } from '../../src/components/EmptyState';
import { Glass } from '../../src/components/Glass';
import { Icon } from '../../src/components/Icon';
import { colors, radius, space, MAX_CONTENT_WIDTH } from '../../src/theme';

const GROUP_GAP_MS = 5 * 60 * 1000;

// Opened as /chat/<roomId>, /chat/new?eventId=<id> for an event's chat, or
// /chat/new?userId=<id> for a DM.
export default function ChatRoom() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { client, status, refreshRooms, configured } = useChat();
  const { user } = useAuth();
  const [room, setRoom] = useState(null); // joined reply
  const [messages, setMessages] = useState([]); // oldest -> newest
  const [error, setError] = useState(null);
  const [text, setText] = useState('');
  const [announce, setAnnounce] = useState(false);
  const [typing, setTyping] = useState(null);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [noMoreHistory, setNoMoreHistory] = useState(false);
  const [other, setOther] = useState(null); // the other member in a DM
  const [attaching, setAttaching] = useState(false);
  const typingTimer = useRef(null);
  const lastTypingSent = useRef(0);
  const roomId = room?.roomId;
  const myId = client?.user?.id || user?.id;

  // Join (and re-join after reconnects).
  useEffect(() => {
    if (!client) return undefined;
    let cancelled = false;
    const target =
      params.roomId && params.roomId !== 'new'
        ? { roomId: params.roomId }
        : params.userId
          ? { userId: params.userId }
          : { eventId: params.eventId };
    client
      .join(target)
      .then((reply) => {
        if (cancelled) return;
        setRoom(reply);
        setMessages(reply.messages || []);
        setNoMoreHistory((reply.messages || []).length < 50);
        setError(null);
      })
      .catch((e) => !cancelled && setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [client, params.roomId, params.eventId, params.userId]);

  // DMs: load the other member for the header.
  useEffect(() => {
    if (room?.kind !== 'DIRECT' || !room.otherUserId) return;
    api.member(room.otherUserId).then(({ member }) => setOther(member)).catch(() => {});
  }, [room?.kind, room?.otherUserId]);

  useEffect(() => {
    if (!client || !roomId) return undefined;
    const upsert = (incoming) =>
      setMessages((list) => {
        const i = list.findIndex((m) => m.id === incoming.id || (incoming.clientId && m.clientId === incoming.clientId));
        if (i === -1) return [...list, incoming];
        const next = list.slice();
        next[i] = { ...incoming, status: undefined };
        return next;
      });
    const offs = [
      client.on('message', ({ message }) => {
        if (message.roomId !== roomId) return;
        upsert(message);
        setTyping(null);
        client.request('read', { roomId }).catch(() => {});
      }),
      client.on('sent', ({ message }) => message.roomId === roomId && upsert(message)),
      client.on('send_failed', ({ clientId, roomId: r, message }) => {
        if (r !== roomId) return;
        setMessages((list) => list.map((m) => (m.clientId === clientId ? { ...m, status: 'failed' } : m)));
        Alert.alert('Message not sent', message);
      }),
      client.on('deleted', ({ roomId: r, messageId }) => {
        if (r !== roomId) return;
        setMessages((list) => list.map((m) => (m.id === messageId ? { ...m, deleted: true, body: null } : m)));
      }),
      // Renamed or new picture (groups, community).
      client.on('room_updated', (update) => {
        if (update.roomId !== roomId) return;
        setRoom((r) => ({
          ...r,
          ...(update.title ? { title: update.title } : {}),
          ...('photoUrl' in update ? { photoUrl: update.photoUrl } : {})
        }));
      }),
      client.on('removed', ({ roomId: r }) => {
        if (r !== roomId) return;
        refreshRooms();
        router.back();
      }),
      client.on('typing', ({ roomId: r, user: who }) => {
        if (r !== roomId) return;
        setTyping(who.name);
        clearTimeout(typingTimer.current);
        typingTimer.current = setTimeout(() => setTyping(null), 4000);
      }),
      client.on('rejoined', (reply) => {
        if (reply.roomId !== roomId) return;
        // Merge anything missed while offline, keep unsent messages.
        setMessages((list) => {
          const unsent = list.filter((m) => m.status === 'pending' || m.status === 'failed');
          const seen = new Set(reply.messages.map((m) => m.clientId).filter(Boolean));
          const older = list.filter((m) => !m.status && m.createdAt < (reply.messages[0]?.createdAt || ''));
          return [...older, ...reply.messages, ...unsent.filter((m) => !seen.has(m.clientId))];
        });
      }),
      client.on('removed', ({ roomId: r }) => {
        if (r !== roomId) return;
        Alert.alert('You’ve left this chat', 'Your RSVP was cancelled, so you’re no longer in the event chat.');
        router.back();
      })
    ];
    return () => {
      offs.forEach((off) => off());
      clearTimeout(typingTimer.current);
      client.leave(roomId); // screen closed: stop live updates for this room
    };
  }, [client, roomId, router, refreshRooms]);

  // While this screen is visible: mark read and hide pushes for this room.
  useFocusEffect(
    useCallback(() => {
      if (!client || !roomId) return undefined;
      setActiveRoom(roomId);
      client.request('read', { roomId }).then(refreshRooms).catch(() => {});
      return () => {
        setActiveRoom(null);
        refreshRooms();
      };
    }, [client, roomId, refreshRooms])
  );

  const loadOlder = async () => {
    if (!client || !roomId || loadingOlder || noMoreHistory || !messages.length) return;
    setLoadingOlder(true);
    try {
      const reply = await client.request('history', { roomId, before: messages[0].createdAt });
      if (reply.messages.length < 50) setNoMoreHistory(true);
      setMessages((list) => [...reply.messages, ...list]);
    } catch {
      // try again on next scroll
    } finally {
      setLoadingOlder(false);
    }
  };

  const send = () => {
    const body = text.trim();
    if (!body || !client || !roomId) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const optimistic = client.send(roomId, { body, kind: announce ? 'announce' : 'send' });
    setMessages((list) => [...list, optimistic]);
    setText('');
    setAnnounce(false);
  };

  // Photos go up through the website first (stored privately), then send.
  const sendPhoto = async (source) => {
    const options = { mediaTypes: ['images'], quality: 0.8, ...COMPATIBLE_PHOTOS };
    if (source === 'camera' && !(await ImagePicker.requestCameraPermissionsAsync()).granted) return;
    const result =
      source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
    const asset = result.assets?.[0];
    if (result.canceled || !asset) return;
    setAttaching(true);
    try {
      const { imageUrl } = await api.uploadChatImage({
        uri: asset.uri,
        mimeType: asset.mimeType || 'image/jpeg',
        fileName: asset.fileName || 'photo.jpg'
      });
      const body = text.trim() || undefined;
      const optimistic = client.send(roomId, { body, imageUrl });
      setMessages((list) => [...list, { ...optimistic, localUri: asset.uri }]);
      setText('');
    } catch (e) {
      Alert.alert('Couldn’t send the photo', e.message);
    } finally {
      setAttaching(false);
    }
  };

  const sendLocation = async () => {
    const permission = await Location.requestForegroundPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Location is off', 'Allow location access for MCR Gents in Settings to share where you are.');
      return;
    }
    setAttaching(true);
    try {
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = position.coords;
      const place = (await Location.reverseGeocodeAsync({ latitude, longitude }).catch(() => []))[0];
      const name = place ? [place.name, place.city].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(', ') : null;
      const confirmed = await new Promise((resolve) =>
        Alert.alert('Share your location?', name || 'Your current location', [
          { text: 'Cancel', style: 'cancel', onPress: () => resolve(false) },
          { text: 'Share', onPress: () => resolve(true) }
        ])
      );
      if (!confirmed) return;
      const optimistic = client.send(roomId, { location: { latitude, longitude, name } });
      setMessages((list) => [...list, optimistic]);
    } catch (e) {
      Alert.alert('Couldn’t get your location', e.message);
    } finally {
      setAttaching(false);
    }
  };

  const attach = () => {
    const actions = [
      { label: 'Photo library', run: () => sendPhoto('library') },
      { label: 'Take photo', run: () => sendPhoto('camera') },
      ...(room?.kind === 'DIRECT' ? [{ label: 'Share my location', run: sendLocation }] : [])
    ];
    if (Platform.OS === 'ios') {
      const labels = [...actions.map((a) => a.label), 'Cancel'];
      ActionSheetIOS.showActionSheetWithOptions(
        { options: labels, cancelButtonIndex: labels.length - 1, userInterfaceStyle: 'dark' },
        (i) => actions[i]?.run()
      );
    } else {
      Alert.alert('Send', undefined, [...actions.map((a) => ({ text: a.label, onPress: a.run })), { text: 'Cancel', style: 'cancel' }]);
    }
  };

  const onChangeText = (value) => {
    setText(value);
    const now = Date.now();
    if (client && roomId && value && now - lastTypingSent.current > 2500) {
      lastTypingSent.current = now;
      client.raw({ type: 'typing', roomId });
    }
  };

  const toggleMute = async () => {
    try {
      const reply = await client.request('mute', { roomId, muted: !room.muted });
      setRoom((r) => ({ ...r, muted: reply.muted }));
      refreshRooms();
    } catch (e) {
      Alert.alert('Couldn’t change notifications', e.message);
    }
  };

  const messageActions = (message) => {
    if (message.deleted || message.status) return;
    const mine = message.sender?.id === myId;
    const isAdmin = Boolean(client?.user?.isAdmin);
    const options = [{ label: 'Copy', run: () => Clipboard.setStringAsync(message.body || '') }];
    if (message.sender && !mine) {
      options.push({ label: `View ${message.sender.name}`, run: () => router.push(`/member/${message.sender.id}`) });
      options.push({ label: 'Report message', destructive: true, run: () => report(message) });
      options.push({ label: `Block ${message.sender.name}`, destructive: true, run: () => block(message.sender) });
    }
    if (mine || (isAdmin && room?.kind === 'EVENT')) {
      options.push({ label: 'Delete message', destructive: true, run: () => remove(message) });
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    if (Platform.OS === 'ios') {
      const labels = [...options.map((o) => o.label), 'Cancel'];
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: labels,
          cancelButtonIndex: labels.length - 1,
          destructiveButtonIndex: options.map((o, i) => (o.destructive ? i : -1)).filter((i) => i >= 0),
          userInterfaceStyle: 'dark'
        },
        (index) => options[index]?.run()
      );
    } else {
      Alert.alert('Message', undefined, [
        ...options.map((o) => ({ text: o.label, style: o.destructive ? 'destructive' : 'default', onPress: o.run })),
        { text: 'Cancel', style: 'cancel' }
      ]);
    }
  };

  const report = (message) =>
    Alert.alert('Report this message?', 'The Manchester Gents team will review it.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Report',
        style: 'destructive',
        onPress: () =>
          client
            .request('report', { messageId: message.id, reason: 'Reported from app' })
            .then(() => Alert.alert('Thanks', 'We’ll take a look.'))
            .catch((e) => Alert.alert('Couldn’t report', e.message))
      }
    ]);

  const block = (sender) =>
    Alert.alert(`Block ${sender.name}?`, 'You won’t see their messages in group chats. You can unblock them from their profile.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Block',
        style: 'destructive',
        onPress: () =>
          client
            .request('block', { userId: sender.id })
            .then(() => {
              if (isDm) router.back();
              else setMessages((list) => list.filter((m) => m.sender?.id !== sender.id));
            })
            .catch((e) => Alert.alert('Couldn’t block', e.message))
      }
    ]);

  const remove = (message) =>
    Alert.alert('Delete this message?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => client.request('delete', { messageId: message.id }).catch((e) => Alert.alert('Couldn’t delete', e.message))
      }
    ]);

  const retry = (message) => {
    setMessages((list) => list.map((m) => (m.clientId === message.clientId ? { ...m, status: 'pending' } : m)));
    client.retry(message.clientId, roomId, message.body);
  };

  // Newest first for the inverted list, with day dividers and sender grouping.
  const rows = useMemo(() => {
    const out = [];
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      const m = messages[i];
      const prev = messages[i - 1];
      const startsGroup =
        !prev ||
        prev.sender?.id !== m.sender?.id ||
        prev.kind === 'ANNOUNCEMENT' ||
        new Date(m.createdAt) - new Date(prev.createdAt) > GROUP_GAP_MS;
      out.push({ type: 'message', key: m.id, message: m, showSender: startsGroup });
      const day = dayDivider(m.createdAt);
      if (!prev || dayDivider(prev.createdAt) !== day) out.push({ type: 'day', key: `day-${m.id}`, label: day });
    }
    return out;
  }, [messages]);

  const isDm = room?.kind === 'DIRECT';
  const isGroup = room?.kind === 'GROUP';

  // Group, community and event chats: who's in it, and (for its admins) settings.
  const openInfo = () => router.push(`/chat-info?roomId=${encodeURIComponent(roomId)}`);
  const title = isDm ? other?.name || 'Message' : room?.title || 'Chat';

  if (!configured) {
    return (
      <View style={styles.screen}>
        <EmptyState symbol="bubble.left.and.exclamationmark.bubble.right" title="Chat isn’t set up" message="The chat server address is missing from the app’s settings." />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title,
          headerTitle: isDm && other
            ? () => (
                <Pressable onPress={() => router.push(`/member/${other.id}`)} style={styles.dmHeader} accessibilityRole="button" accessibilityLabel={`View ${other.name}'s profile`}>
                  <Avatar name={other.name} uri={other.avatarUrl} size={28} />
                  <Text style={styles.dmHeaderName} numberOfLines={1}>{other.name}</Text>
                </Pressable>
              )
            : undefined,
          headerRight: room
            ? () => (
                <View style={styles.headerButtons}>
                  {!isDm ? (
                    <Pressable onPress={openInfo} hitSlop={12} accessibilityRole="button" accessibilityLabel="Chat info and members">
                      {Platform.OS === 'ios' ? <Icon name="info.circle" size={21} color={colors.gold} /> : <Text style={styles.headerAction}>Info</Text>}
                    </Pressable>
                  ) : null}
                  <Pressable onPress={toggleMute} hitSlop={12} accessibilityRole="button" accessibilityLabel={room.muted ? 'Unmute notifications' : 'Mute notifications'}>
                    {Platform.OS === 'ios' ? (
                      <Icon name={room.muted ? 'bell.slash' : 'bell'} size={20} color={colors.gold} />
                    ) : (
                      <Text style={styles.headerAction}>{room.muted ? 'Unmute' : 'Mute'}</Text>
                    )}
                  </Pressable>
                </View>
              )
            : undefined
        }}
      />
      <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={0}>
        {error ? (
          <EmptyState symbol="lock" title="Can’t open this chat" message={error} />
        ) : !room ? (
          <View style={styles.center}>
            <ActivityIndicator color={colors.gold} />
          </View>
        ) : (
          <>
          {room.regarding ? (
            // Groups can be about an event: open it.
            <Pressable onPress={() => router.push(`/event/${room.regarding.id}`)} style={[styles.regarding, { top: insets.top + 52 }]} accessibilityRole="link">
              <Icon name="calendar" size={14} color={colors.navy} />
              <Text style={styles.regardingText} numberOfLines={1}>About: {room.regarding.title}</Text>
            </Pressable>
          ) : null}
          <FlatList
            inverted
            style={styles.list}
            contentContainerStyle={[styles.listContent, { paddingLeft: insets.left, paddingRight: insets.right }]}
            data={rows}
            keyExtractor={(r) => r.key}
            keyboardDismissMode="interactive"
            onEndReached={loadOlder}
            onEndReachedThreshold={0.3}
            ListFooterComponent={loadingOlder ? <ActivityIndicator color={colors.gold} style={styles.older} /> : null}
            ListEmptyComponent={
              <View style={styles.flipped}>
                <EmptyState
                  symbol="hand.wave"
                  title="Say hello"
                  message={
                    isDm
                      ? `Only you and ${other?.name || 'this member'} can see these messages.`
                      : isGroup
                        ? 'Only the people in this group can see these messages.'
                        : room.kind === 'COMMUNITY'
                          ? 'Every member of Manchester Gents can see these messages.'
                          : 'Messages here are seen by everyone going to this event.'
                  }
                />
              </View>
            }
            renderItem={({ item }) =>
              item.type === 'day' ? (
                <Text style={styles.day}>{item.label}</Text>
              ) : (
                <MessageBubble
                  message={item.message}
                  mine={item.message.sender?.id === myId}
                  showSender={item.showSender}
                  onLongPress={() => messageActions(item.message)}
                  onPressSender={() => item.message.sender && router.push(`/member/${item.message.sender.id}`)}
                  onRetry={() => retry(item.message)}
                />
              )
            }
          />
          </>
        )}

        {room ? (
          <View style={[styles.composerWrap, { paddingBottom: Math.max(insets.bottom, space.sm), paddingLeft: insets.left + space.md, paddingRight: insets.right + space.md }]}>
            {typing ? <Text style={styles.typing}>{typing} is typing…</Text> : null}
            {status !== 'ready' ? <Text style={styles.offline}>Reconnecting… messages will send when you’re back online.</Text> : null}
            {room.canPost ? (
              <Glass style={styles.composer} interactive>
                <Pressable
                  onPress={attach}
                  disabled={attaching || announce}
                  style={styles.attachButton}
                  accessibilityRole="button"
                  accessibilityLabel={isDm ? 'Send a photo or your location' : 'Send a photo'}
                >
                  {attaching ? (
                    <ActivityIndicator color={colors.gold} />
                  ) : Platform.OS === 'ios' ? (
                    <Icon name="plus.circle.fill" size={24} color={colors.gold} />
                  ) : (
                    <Text style={styles.announceText}>+</Text>
                  )}
                </Pressable>
                {client?.user?.isAdmin && room.kind !== 'DIRECT' ? (
                  <Pressable
                    onPress={() => setAnnounce((a) => !a)}
                    style={[styles.announceToggle, announce && styles.announceOn]}
                    accessibilityRole="switch"
                    accessibilityState={{ checked: announce }}
                    accessibilityLabel="Send as announcement"
                  >
                    {Platform.OS === 'ios' ? (
                      <Icon name="megaphone.fill" size={16} color={announce ? colors.navy : colors.gold} />
                    ) : (
                      <Text style={[styles.announceText, announce && { color: colors.navy }]}>📣</Text>
                    )}
                  </Pressable>
                ) : null}
                <TextInput
                  style={styles.input}
                  placeholder={announce ? (room.kind === 'COMMUNITY' ? 'Announcement to every member…' : 'Announcement to everyone going…') : 'Message'}
                  placeholderTextColor={colors.textFaint}
                  value={text}
                  onChangeText={onChangeText}
                  multiline
                  maxLength={2000}
                  accessibilityLabel="Message"
                />
                <Pressable
                  onPress={send}
                  disabled={!text.trim()}
                  style={[styles.sendButton, !text.trim() && styles.sendDisabled]}
                  accessibilityRole="button"
                  accessibilityLabel={announce ? 'Send announcement' : 'Send message'}
                >
                  {Platform.OS === 'ios' ? (
                    <Icon name="arrow.up" size={18} color={colors.navy} />
                  ) : (
                    <Text style={styles.sendText}>Send</Text>
                  )}
                </Pressable>
              </Glass>
            ) : room.closed ? (
              // Event chats close 48 hours after the social.
              <View style={styles.closed}>
                <Text style={styles.readOnly}>
                  This chat closed 48 hours after the social. Keep talking in the community chat, or message someone directly.
                </Text>
                <Pressable onPress={() => router.replace('/chat/community')} accessibilityRole="button" style={styles.closedButton}>
                  <Text style={styles.closedButtonText}>Go to the community chat</Text>
                </Pressable>
              </View>
            ) : (
              <Text style={styles.readOnly}>{isDm ? 'You can’t message this member.' : 'This chat is read-only.'}</Text>
            )}
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.navy },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { flex: 1 },
  listContent: { paddingVertical: space.md, width: '100%', maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center' },
  flipped: { transform: [{ scaleY: -1 }] },
  older: { marginVertical: space.lg },
  day: { color: colors.textFaint, fontSize: 12, fontWeight: '600', textAlign: 'center', marginVertical: space.md },
  composerWrap: { paddingHorizontal: space.md, paddingTop: space.xs, width: '100%', maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center' },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: radius.lg,
    paddingLeft: space.md,
    paddingRight: 6,
    paddingVertical: 6,
    gap: space.sm,
    overflow: 'hidden'
  },
  input: { flex: 1, color: colors.text, fontSize: 16, maxHeight: 140, paddingTop: 9, paddingBottom: 9 },
  sendButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
  sendDisabled: { opacity: 0.4 },
  sendText: { color: colors.navy, fontWeight: '700', fontSize: 12 },
  announceToggle: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', marginBottom: 1 },
  announceOn: { backgroundColor: colors.gold },
  announceText: { fontSize: 16 },
  typing: { color: colors.textMuted, fontSize: 13, marginLeft: space.md, marginBottom: 4 },
  offline: { color: colors.gold, fontSize: 13, textAlign: 'center', marginBottom: 6 },
  attachButton: { width: 34, height: 34, alignItems: 'center', justifyContent: 'center', marginBottom: 1 },
  closed: { gap: space.sm, alignItems: 'center', paddingBottom: space.sm },
  closedButton: { paddingHorizontal: space.lg, paddingVertical: space.sm, borderRadius: radius.pill, backgroundColor: colors.gold },
  closedButtonText: { color: colors.navy, fontWeight: '700' },
  headerButtons: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  regarding: {
    position: 'absolute',
    alignSelf: 'center',
    zIndex: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    maxWidth: '80%',
    backgroundColor: colors.gold,
    borderRadius: radius.pill,
    paddingHorizontal: space.md,
    paddingVertical: 6
  },
  regardingText: { color: colors.navy, fontSize: 13, fontWeight: '700', flexShrink: 1 },
  readOnly: { color: colors.textMuted, textAlign: 'center', paddingVertical: space.md },
  headerAction: { color: colors.gold, fontWeight: '600' },
  dmHeader: { flexDirection: 'row', alignItems: 'center', gap: space.sm, maxWidth: 240 },
  dmHeaderName: { color: colors.text, fontSize: 17, fontWeight: '600' }
});
