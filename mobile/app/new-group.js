import { useEffect, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '../src/lib/api';
import { useChat } from '../src/context/ChatContext';
import { eventWhen } from '../src/lib/format';
import { useSheetPadding } from '../src/lib/layout';
import { Avatar } from '../src/components/Avatar';
import { Button } from '../src/components/Button';
import { Icon } from '../src/components/Icon';
import { colors, radius, space } from '../src/theme';

// New group chat: a name, optionally the event it's about, and people.
// With ?roomId= it adds people to that group instead.
export default function NewGroup() {
  const { roomId } = useLocalSearchParams();
  const adding = Boolean(roomId);
  const router = useRouter();
  const gutter = useSheetPadding(space.lg);
  const { client, refreshRooms } = useChat();
  const [title, setTitle] = useState('');
  const [events, setEvents] = useState([]);
  const [eventId, setEventId] = useState(null);
  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [picked, setPicked] = useState(new Map());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (adding) return;
    Promise.all([api.events('upcoming').catch(() => ({ events: [] })), api.events('past').catch(() => ({ events: [] }))]).then(
      ([up, past]) => setEvents([...up.events, ...past.events.slice(0, 3)])
    );
  }, [adding]);

  useEffect(() => {
    if (q.trim().length < 2) {
      setResults([]);
      return undefined;
    }
    const timer = setTimeout(() => {
      api
        .searchMembers(q.trim())
        .then(({ members }) => setResults(members))
        .catch(() => {});
    }, 250);
    return () => clearTimeout(timer);
  }, [q]);

  const toggle = (m) =>
    setPicked((current) => {
      const next = new Map(current);
      if (next.has(m.id)) next.delete(m.id);
      else next.set(m.id, m);
      return next;
    });

  const submit = async () => {
    setBusy(true);
    try {
      const userIds = [...picked.keys()];
      if (adding) {
        await client.request('add_members', { roomId, userIds });
        router.back();
      } else {
        const reply = await client.request('create_group', { title: title.trim(), userIds, eventId });
        refreshRooms();
        router.replace(`/chat/${reply.roomId}`);
      }
    } catch (e) {
      Alert.alert(adding ? 'Couldn’t add people' : 'Couldn’t create the group', e.message);
      setBusy(false);
    }
  };

  const ready = picked.size > 0 && (adding || title.trim().length > 0) && client;

  return (
    <>
      <Stack.Screen options={{ title: adding ? 'Add people' : 'New group' }} />
      <FlatList keyboardDismissMode="interactive"
        style={styles.screen}
        contentContainerStyle={[styles.content, gutter]}
        contentInsetAdjustmentBehavior="never"
        keyboardShouldPersistTaps="handled"
        data={results}
        keyExtractor={(m) => m.id}
        ListHeaderComponent={
          <View style={styles.header}>
            {!adding ? (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="Group name"
                  placeholderTextColor={colors.textFaint}
                  value={title}
                  onChangeText={setTitle}
                  maxLength={60}
                  autoFocus
                />
                <Text style={styles.label}>About an event? (optional)</Text>
                <FlatList keyboardDismissMode="interactive"
                  horizontal
                  data={[{ id: null, title: 'General' }, ...events]}
                  keyExtractor={(e) => e.id || 'general'}
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: space.sm }}
                  keyboardShouldPersistTaps="handled"
                  renderItem={({ item }) => (
                    <Pressable
                      onPress={() => setEventId(item.id)}
                      style={[styles.chip, eventId === item.id && styles.chipOn]}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: eventId === item.id }}
                    >
                      <Text style={[styles.chipText, eventId === item.id && styles.chipTextOn]} numberOfLines={1}>
                        {item.title}
                        {item.startTime ? ` · ${eventWhen(item.startTime).date.split(' ').slice(1, 3).join(' ')}` : ''}
                      </Text>
                    </Pressable>
                  )}
                />
              </>
            ) : null}
            {picked.size ? (
              <Text style={styles.label}>
                {picked.size} {picked.size === 1 ? 'person' : 'people'}: {[...picked.values()].map((m) => m.name.split(' ')[0]).join(', ')}
              </Text>
            ) : null}
            <TextInput
              style={styles.input}
              placeholder="Search members by name or @instagram"
              placeholderTextColor={colors.textFaint}
              value={q}
              onChangeText={setQ}
              autoCapitalize="none"
              autoCorrect={false}
              clearButtonMode="while-editing"
              autoFocus={adding}
            />
          </View>
        }
        renderItem={({ item }) => (
          <Pressable onPress={() => toggle(item)} style={({ pressed }) => [styles.row, pressed && styles.pressed]} accessibilityRole="checkbox" accessibilityState={{ checked: picked.has(item.id) }}>
            <Avatar name={item.name} uri={item.avatarUrl} size={40} />
            <Text style={styles.name}>{item.name}</Text>
            {picked.has(item.id) ? <Icon name="checkmark.circle.fill" size={22} color={colors.gold} /> : <Text style={styles.add}>Add</Text>}
          </Pressable>
        )}
        ListFooterComponent={
          <Button
            title={adding ? `Add ${picked.size || ''} ${picked.size === 1 ? 'person' : 'people'}`.replace('  ', ' ') : 'Create group'}
            onPress={submit}
            disabled={!ready}
            loading={busy}
            style={styles.button}
          />
        }
      />
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.navy },
  content: { paddingVertical: space.lg, gap: space.xs },
  header: { gap: space.md, marginBottom: space.sm },
  input: { backgroundColor: colors.card, borderRadius: radius.pill, color: colors.text, fontSize: 16, paddingHorizontal: space.lg, paddingVertical: 12 },
  label: { color: colors.textMuted, fontSize: 14 },
  chip: { paddingHorizontal: space.md, paddingVertical: 8, borderRadius: radius.pill, backgroundColor: colors.card, maxWidth: 260 },
  chipOn: { backgroundColor: colors.gold },
  chipText: { color: colors.text, fontSize: 14, fontWeight: '600' },
  chipTextOn: { color: colors.navy },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm, borderRadius: radius.md },
  pressed: { backgroundColor: colors.cardPressed },
  name: { flex: 1, color: colors.text, fontSize: 16, fontWeight: '600' },
  add: { color: colors.gold, fontWeight: '600' },
  button: { marginTop: space.lg }
});
