import { useEffect, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '../../../src/lib/api';
import { useGutter } from '../../../src/lib/layout';
import { Avatar } from '../../../src/components/Avatar';
import { Button } from '../../../src/components/Button';
import { Icon } from '../../../src/components/Icon';
import { ListRow } from '../../../src/components/ListGroup';
import { colors, radius, space } from '../../../src/theme';

// Search members (placeholders included) and add them to an event's guest list.
export default function AddGuests() {
  const { eventId } = useLocalSearchParams();
  const router = useRouter();
  const gutter = useGutter(space.lg);
  const [q, setQ] = useState('');
  const [members, setMembers] = useState([]);
  const [existing, setExisting] = useState(new Set());
  const [picked, setPicked] = useState(new Map());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.admin
      .event(eventId)
      .then(({ attendees }) => setExisting(new Set(attendees.map((a) => a.member.id))))
      .catch(() => {});
  }, [eventId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      api.admin
        .members(q.trim(), { placeholders: true })
        .then(({ members: list }) => setMembers(list))
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

  const add = async () => {
    setBusy(true);
    try {
      await api.admin.addGuests(eventId, [...picked.keys()]);
      router.back();
    } catch (e) {
      Alert.alert('Couldn’t add guests', e.message);
      setBusy(false);
    }
  };

  return (
    <View style={[styles.screen, gutter]}>
      <TextInput
        style={styles.search}
        placeholder="Search name, @handle or email"
        placeholderTextColor={colors.textFaint}
        value={q}
        onChangeText={setQ}
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="while-editing"
      />
      <FlatList
        style={styles.list}
        data={members.filter((m) => !existing.has(m.id))}
        keyExtractor={(m) => m.id}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item: m }) => (
          <ListRow
            left={<Avatar name={m.name} uri={m.avatarUrl} size={36} />}
            title={m.name}
            subtitle={[m.instagramHandle ? `@${m.instagramHandle}` : null, m.isPlaceholder ? 'Placeholder' : null].filter(Boolean).join(' · ')}
            right={picked.has(m.id) ? <Icon name="checkmark.circle.fill" size={22} color={colors.gold} /> : <Text style={styles.add}>Add</Text>}
            chevron={false}
            onPress={() => toggle(m)}
          />
        )}
      />
      <Button
        title={picked.size ? `Add ${picked.size} ${picked.size === 1 ? 'guest' : 'guests'}` : 'Select guests'}
        onPress={add}
        disabled={!picked.size}
        loading={busy}
        style={styles.button}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.navy, paddingTop: space.lg, gap: space.md },
  search: { backgroundColor: colors.card, borderRadius: radius.pill, color: colors.text, fontSize: 16, paddingHorizontal: space.lg, paddingVertical: 12 },
  list: { flex: 1, backgroundColor: colors.card, borderRadius: radius.lg },
  add: { color: colors.gold, fontWeight: '600' },
  button: { marginBottom: space.xl }
});
