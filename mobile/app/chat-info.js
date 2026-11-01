import { useCallback, useEffect, useState } from 'react';
import { ActionSheetIOS, Alert, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { api } from '../src/lib/api';
import { pickImage } from '../src/lib/pickImage';
import { useGutter } from '../src/lib/layout';
import { useAuth } from '../src/context/AuthContext';
import { useChat } from '../src/context/ChatContext';
import { Avatar } from '../src/components/Avatar';
import { Button } from '../src/components/Button';
import { Chip } from '../src/components/Chip';
import { Field } from '../src/components/Form';
import { Icon } from '../src/components/Icon';
import { ListGroup, ListRow } from '../src/components/ListGroup';
import { colors, fonts, space } from '../src/theme';

function choose(title, actions) {
  if (Platform.OS === 'ios') {
    const labels = [...actions.map((a) => a.label), 'Cancel'];
    ActionSheetIOS.showActionSheetWithOptions(
      { options: labels, cancelButtonIndex: labels.length - 1, destructiveButtonIndex: actions.findIndex((a) => a.destructive), title, userInterfaceStyle: 'dark' },
      (i) => actions[i]?.run()
    );
  } else {
    Alert.alert(title, undefined, [...actions.map((a) => ({ text: a.label, style: a.destructive ? 'destructive' : 'default', onPress: a.run })), { text: 'Cancel', style: 'cancel' }]);
  }
}

// A chat's details and who's in it (groups, the community chat, event chats).
// Group admins change the picture and name, make others admins and remove
// people; site admins manage the community and event chats' pictures.
export default function ChatInfo() {
  const { roomId } = useLocalSearchParams();
  const router = useRouter();
  const gutter = useGutter(space.lg);
  const { user } = useAuth();
  const { client, refreshRooms } = useChat();
  const [room, setRoom] = useState(null);
  const [members, setMembers] = useState([]);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(null);

  const load = useCallback(async () => {
    if (!client) return;
    try {
      const joined = await client.join({ roomId });
      setRoom(joined);
      setName(joined.title || '');
      setMembers((await client.request('group_members', { roomId })).members);
    } catch (e) {
      Alert.alert('Couldn’t load this chat', e.message);
    }
  }, [client, roomId]);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (label, fn) => {
    setBusy(label);
    try {
      await fn();
      await load();
      refreshRooms();
    } catch (e) {
      Alert.alert('Something went wrong', e.message);
    } finally {
      setBusy(null);
    }
  };

  if (!room) return <View style={styles.screen} />;
  const isGroup = room.kind === 'GROUP';
  const canManage = room.canManage;

  const changePhoto = async () => {
    const asset = await pickImage({ title: 'Chat picture', message: 'Everyone in this chat sees it.' });
    if (asset) act('photo', () => api.setChatPhoto(roomId, asset));
  };

  const memberActions = (m) => {
    const actions = [{ label: 'View profile', run: () => router.push(`/member/${m.id}`) }];
    if (isGroup && canManage && m.id !== user?.id) {
      actions.push(
        m.isAdmin
          ? { label: 'Remove as admin', run: () => act('admin', () => client.request('set_admin', { roomId, userId: m.id, isAdmin: false })) }
          : { label: 'Make admin', run: () => act('admin', () => client.request('set_admin', { roomId, userId: m.id, isAdmin: true })) },
        {
          label: 'Remove from group',
          destructive: true,
          run: () => act('remove', () => client.request('remove_member', { roomId, userId: m.id }))
        }
      );
    }
    choose(m.name, actions);
  };

  const leave = () =>
    Alert.alert('Leave this group?', 'You won’t see its messages any more unless someone adds you back.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Leave group',
        style: 'destructive',
        onPress: async () => {
          try {
            await client.request('leave_group', { roomId });
            refreshRooms();
            router.replace('/chats');
          } catch (e) {
            Alert.alert('Couldn’t leave', e.message);
          }
        }
      }
    ]);

  return (
    <>
      <Stack.Screen options={{ title: isGroup ? 'Group info' : 'Chat info' }} />
      <ScrollView keyboardDismissMode="interactive" style={styles.screen} contentContainerStyle={[styles.content, gutter]} keyboardShouldPersistTaps="handled">
        <Pressable onPress={canManage ? changePhoto : undefined} disabled={!canManage || busy === 'photo'} style={styles.photoWrap} accessibilityRole={canManage ? 'button' : 'image'} accessibilityLabel={canManage ? 'Change chat picture' : 'Chat picture'}>
          {room.photoUrl ? (
            <Image source={{ uri: room.photoUrl }} style={styles.photo} contentFit="cover" transition={150} />
          ) : (
            <View style={[styles.photo, styles.photoEmpty]}>
              <Icon name={isGroup ? 'person.2.fill' : room.kind === 'EVENT' ? 'calendar' : 'person.3.fill'} size={40} color={colors.gold} />
            </View>
          )}
          {canManage ? <Text style={styles.photoHint}>{busy === 'photo' ? 'Uploading…' : room.photoUrl ? 'Change picture' : 'Add a picture'}</Text> : null}
        </Pressable>
        {canManage && room.photoUrl ? (
          <Button title="Remove picture" variant="ghost" onPress={() => act('photo', () => api.removeChatPhoto(roomId))} />
        ) : null}

        {isGroup && canManage ? (
          <View style={styles.rename}>
            <Field label="Group name" value={name} onChangeText={setName} maxLength={60} />
            {name.trim() && name.trim() !== room.title ? (
              <Button title="Save name" variant="secondary" loading={busy === 'name'} onPress={() => act('name', () => client.request('rename_group', { roomId, title: name.trim() }))} />
            ) : null}
          </View>
        ) : (
          <Text style={styles.title}>{room.title}</Text>
        )}
        {room.regarding ? (
          <Chip label={`About: ${room.regarding.title}`} tone="gold" symbol="calendar" style={{ alignSelf: 'center' }} onPress={() => router.push(`/event/${room.regarding.id}`)} />
        ) : null}

        <ListGroup
          title={`${members.length} ${room.kind === 'EVENT' ? 'going' : 'members'}`}
          footer={
            isGroup && canManage
              ? 'Tap someone to make them an admin or remove them.'
              : room.kind === 'COMMUNITY'
                ? 'Every member of Manchester Gents is in the community chat. Site admins look after it.'
                : room.kind === 'EVENT'
                  ? 'Everyone going to this social is in its chat.'
                  : undefined
          }
        >
          {members.map((m) => (
            <ListRow
              key={m.id}
              left={<Avatar name={m.name} uri={m.photoUrl} size={36} />}
              title={m.id === user?.id ? `${m.name} (you)` : m.name}
              right={m.isAdmin ? 'Admin' : undefined}
              onPress={() => memberActions(m)}
            />
          ))}
          {isGroup ? (
            <ListRow symbol="person.badge.plus" title="Add people" onPress={() => router.push(`/new-group?roomId=${encodeURIComponent(roomId)}`)} />
          ) : null}
        </ListGroup>
        {isGroup ? (
          <ListGroup>
            <ListRow title="Leave group" destructive chevron={false} onPress={leave} />
          </ListGroup>
        ) : null}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.navy },
  content: { paddingVertical: space.xl, gap: space.lg, paddingBottom: 80 },
  photoWrap: { alignItems: 'center', gap: space.sm },
  photo: { width: 120, height: 120, borderRadius: 60 },
  photoEmpty: { backgroundColor: colors.steel, alignItems: 'center', justifyContent: 'center' },
  photoHint: { color: colors.gold, fontWeight: '600' },
  rename: { gap: space.sm },
  title: { color: colors.gold, fontFamily: fonts.heading, fontSize: 30, textAlign: 'center' }
});
