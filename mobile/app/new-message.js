import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../src/lib/api';
import { Avatar } from '../src/components/Avatar';
import { colors, radius, space } from '../src/theme';

// Find any member to message.
export default function NewMessage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const latest = useRef(0);

  useEffect(() => {
    const q = query.trim();
    if (q.replace(/^@/, '').length < 2) {
      setResults([]);
      return undefined;
    }
    const ticket = ++latest.current;
    setLoading(true);
    const timer = setTimeout(() => {
      api
        .searchMembers(q)
        .then(({ members }) => ticket === latest.current && (setResults(members), setError(null)))
        .catch((e) => ticket === latest.current && setError(e.message))
        .finally(() => ticket === latest.current && setLoading(false));
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  const open = (member) => {
    router.back();
    router.push(`/chat/new?userId=${encodeURIComponent(member.id)}`);
  };

  return (
    <View style={styles.screen}>
      <TextInput
        style={styles.search}
        placeholder="Search by name or @instagram"
        placeholderTextColor={colors.textFaint}
        value={query}
        onChangeText={setQuery}
        autoFocus
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        accessibilityLabel="Search members"
      />
      {loading ? <ActivityIndicator color={colors.gold} style={styles.spinner} /> : null}
      {error ? <Text style={styles.hint}>{error}</Text> : null}
      <FlatList
        data={results}
        keyExtractor={(m) => m.id}
        keyboardShouldPersistTaps="handled"
        renderItem={({ item }) => (
          <Pressable onPress={() => open(item)} style={({ pressed }) => [styles.row, pressed && styles.pressed]} accessibilityRole="button">
            <Avatar name={item.name} uri={item.avatarUrl} size={44} />
            <View style={styles.text}>
              <Text style={styles.name}>{item.name}</Text>
              {item.instagram ? <Text style={styles.handle}>@{item.instagram.handle}</Text> : null}
            </View>
          </Pressable>
        )}
        ListEmptyComponent={
          !loading && query.trim().length >= 2 && !error ? <Text style={styles.hint}>No members found.</Text> : null
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.navy, padding: space.lg, gap: space.md },
  search: { backgroundColor: colors.card, borderRadius: radius.pill, color: colors.text, fontSize: 16, paddingHorizontal: space.lg, paddingVertical: 12 },
  spinner: { marginTop: space.sm },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.sm, borderRadius: radius.md },
  pressed: { backgroundColor: colors.cardPressed },
  text: { flex: 1 },
  name: { color: colors.text, fontSize: 16, fontWeight: '600' },
  handle: { color: colors.textMuted, fontSize: 14 },
  hint: { color: colors.textMuted, textAlign: 'center', marginTop: space.lg }
});
