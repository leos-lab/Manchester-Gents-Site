import { useEffect, useState } from 'react';
import { Alert, FlatList, RefreshControl, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../../../src/lib/api';
import { useGutter } from '../../../src/lib/layout';
import { memberSince } from '../../../src/lib/format';
import { MemberAvatar } from '../../../src/components/MemberAvatar';
import { Button } from '../../../src/components/Button';
import { Field, ToggleRow } from '../../../src/components/Form';
import { ListRow } from '../../../src/components/ListGroup';
import { colors, radius, space } from '../../../src/theme';
import { useKeyboardDone } from '../../../src/components/KeyboardDone';

// Member directory with search, placeholders, and adding a placeholder
// (someone who came along before joining, recorded by Instagram handle).
export default function AdminMembers() {
  const keyboard = useKeyboardDone();
  const router = useRouter();
  const gutter = useGutter(space.lg);
  const [q, setQ] = useState('');
  const [placeholders, setPlaceholders] = useState(false);
  const [members, setMembers] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ firstName: '', instagramHandle: '' });

  const load = () =>
    api.admin
      .members(q.trim(), { placeholders })
      .then(({ members: list }) => setMembers(list))
      .catch(() => {});

  useEffect(() => {
    const timer = setTimeout(load, 250);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, placeholders]);

  const addPlaceholder = async () => {
    try {
      const handle = draft.instagramHandle.trim().replace(/^@/, '');
      await api.admin.addPlaceholders([{ firstName: draft.firstName.trim(), instagramHandle: handle }]);
      setDraft({ firstName: '', instagramHandle: '' });
      setAdding(false);
      setPlaceholders(true);
      setQ(handle);
    } catch (e) {
      Alert.alert('Couldn’t add placeholder', e.message);
    }
  };

  return (
    <FlatList
      style={styles.screen}
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={[styles.content, gutter]}
      data={members || []}
      keyExtractor={(m) => m.id}
      keyboardShouldPersistTaps="handled"
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
      ListHeaderComponent={
        <View style={styles.header}>
          <TextInput
              {...keyboard.inputProps}
            style={styles.search}
            placeholder="Search name, @handle or email"
            placeholderTextColor={colors.textFaint}
            value={q}
            onChangeText={setQ}
            autoCapitalize="none"
            autoCorrect={false}
            clearButtonMode="while-editing"
          />
            {keyboard.bar}
          <ToggleRow title="Include placeholders" value={placeholders} onValueChange={setPlaceholders} />
          {adding ? (
            <View style={styles.addForm}>
              <Field label="First name" value={draft.firstName} onChangeText={(firstName) => setDraft((d) => ({ ...d, firstName }))} />
              <Field label="Instagram handle" value={draft.instagramHandle} onChangeText={(instagramHandle) => setDraft((d) => ({ ...d, instagramHandle }))} autoCapitalize="none" autoCorrect={false} />
              <Button title="Add placeholder" onPress={addPlaceholder} disabled={!draft.firstName.trim() || draft.instagramHandle.trim().length < 2} />
            </View>
          ) : (
            <Button title="Add a placeholder" variant="ghost" onPress={() => setAdding(true)} />
          )}
          {members ? <Text style={styles.count}>{members.length === 200 ? 'First 200 matches' : `${members.length} members`}</Text> : null}
        </View>
      }
      renderItem={({ item: m, index }) => (
        <View style={[styles.cell, index === 0 && styles.first, index === members.length - 1 && styles.last]}>
          <ListRow
            left={<MemberAvatar member={m} size={40} />}
            title={m.name}
            subtitle={[
              m.instagramHandle ? `@${m.instagramHandle}` : m.email,
              m.isPlaceholder ? 'Placeholder' : `joined ${memberSince(m.memberSince)}`,
              m.chatBanned ? 'Banned from chat' : null
            ]
              .filter(Boolean)
              .join(' · ')}
            onPress={() => router.push(`/admin/member/${m.id}`)}
          />
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.navy },
  content: { paddingBottom: 140 },
  header: { gap: space.md, paddingVertical: space.lg },
  search: { backgroundColor: colors.card, borderRadius: radius.pill, color: colors.text, fontSize: 16, paddingHorizontal: space.lg, paddingVertical: 12 },
  addForm: { gap: space.md, backgroundColor: colors.card, borderRadius: radius.lg, padding: space.lg },
  count: { color: colors.textFaint, fontSize: 13, marginLeft: space.xs },
  cell: { backgroundColor: colors.card, overflow: 'hidden' },
  first: { borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg },
  last: { borderBottomLeftRadius: radius.lg, borderBottomRightRadius: radius.lg }
});
