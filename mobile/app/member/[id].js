import { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { api } from '../../src/lib/api';
import { useChat } from '../../src/context/ChatContext';
import { memberSince } from '../../src/lib/format';
import { Avatar } from '../../src/components/Avatar';
import { Button } from '../../src/components/Button';
import { Chip } from '../../src/components/Chip';
import { Content } from '../../src/components/Content';
import { EmptyState } from '../../src/components/EmptyState';
import { Stat, openInstagram } from '../../src/components/ProfileBits';
import { colors, fonts, radius, space } from '../../src/theme';

// Member profile: photo, name, member since, events attended, Instagram. No posts.
export default function MemberProfile() {
  const { id } = useLocalSearchParams();
  const { client } = useChat();
  const [member, setMember] = useState(null);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    try {
      const { member: m } = await api.member(id);
      setMember(m);
    } catch (e) {
      setError(e.message);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const toggleBlock = () => {
    const blocking = !member.blockedByMe;
    const go = () =>
      client
        ?.request(blocking ? 'block' : 'unblock', { userId: member.id })
        .then(load)
        .catch((e) => Alert.alert('Something went wrong', e.message));
    if (!blocking) return go();
    Alert.alert(`Block ${member.name}?`, 'You won’t see their messages in group chats, and neither of you can message the other.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Block', style: 'destructive', onPress: go }
    ]);
  };

  if (error) {
    return (
      <View style={styles.screen}>
        <EmptyState symbol="person.crop.circle.badge.exclamationmark" title="Member not found" message={error} />
      </View>
    );
  }
  if (!member) return <View style={styles.screen} />;

  return (
    <>
      <Stack.Screen options={{ title: '' }} />
      <ScrollView style={styles.screen} contentInsetAdjustmentBehavior="automatic">
        <Content style={styles.content}>
          <Avatar name={member.name} uri={member.avatarUrl} size={128} ring />
          <Text style={styles.name}>{member.name}</Text>
          {member.isAdmin ? <Chip label="Manchester Gents team" tone="gold" symbol="star.fill" /> : null}

          <View style={styles.stats}>
            <Stat value={member.eventsAttended} label={member.eventsAttended === 1 ? 'Event attended' : 'Events attended'} />
            <View style={styles.divider} />
            <Stat value={memberSince(member.memberSince)} label="Member since" small />
          </View>

          {member.bio ? <Text style={styles.bio}>{member.bio}</Text> : null}

          {member.instagram ? (
            <Chip
              label={`@${member.instagram.handle}`}
              symbol="camera"
              onPress={() => openInstagram(member.instagram)}
              accessibilityLabel={`Open @${member.instagram.handle} on Instagram`}
            />
          ) : null}

          {!member.isMe ? (
            <Button
              title={member.blockedByMe ? `Unblock ${member.name}` : `Block ${member.name}`}
              variant={member.blockedByMe ? 'secondary' : 'ghost'}
              onPress={toggleBlock}
              style={styles.block}
            />
          ) : null}
        </Content>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.navy },
  content: { alignItems: 'center', padding: space.xl, gap: space.lg },
  name: { color: colors.gold, fontFamily: fonts.heading, fontSize: 38, textAlign: 'center' },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    paddingVertical: space.lg,
    paddingHorizontal: space.xl,
    gap: space.xl
  },
  divider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', backgroundColor: colors.border },
  bio: { color: colors.text, fontSize: 16, lineHeight: 23, textAlign: 'center' },
  block: { marginTop: space.lg }
});
