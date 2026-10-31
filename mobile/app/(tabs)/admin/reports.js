import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../../../src/lib/api';
import { useLoader } from '../../../src/lib/useLoader';
import { messageTime } from '../../../src/lib/format';
import { Button } from '../../../src/components/Button';
import { Content } from '../../../src/components/Content';
import { EmptyState } from '../../../src/components/EmptyState';
import { ListGroup, ListRow } from '../../../src/components/ListGroup';
import { colors, radius, space } from '../../../src/theme';

// Reported chat messages (several reports on one message are handled
// together), and members currently banned from chat.
export default function AdminReports() {
  const router = useRouter();
  const { data, refreshing, refresh, reload } = useLoader(() => api.admin.reports());

  const act = (item, action) => {
    const labels = {
      dismiss: ['Dismiss report?', 'The message stays up.', 'Dismiss'],
      remove: ['Remove message?', 'It disappears for everyone, live.', 'Remove'],
      remove_and_ban: [
        `Remove and ban ${item.message.author?.name || 'the author'}?`,
        'The message disappears and they can no longer post in any chat until unbanned.',
        'Remove and ban'
      ]
    }[action];
    Alert.alert(labels[0], labels[1], [
      { text: 'Cancel', style: 'cancel' },
      {
        text: labels[2],
        style: action === 'dismiss' ? 'default' : 'destructive',
        onPress: async () => {
          try {
            // Acting on any report resolves the message's other open reports too.
            await api.admin.actOnReport(item.reports[0].id, action);
            if (action === 'dismiss') {
              for (const r of item.reports.slice(1)) await api.admin.actOnReport(r.id, 'dismiss');
            }
            await reload();
          } catch (e) {
            Alert.alert('Couldn’t update the report', e.message);
          }
        }
      }
    ]);
  };

  return (
    <ScrollView
      style={styles.screen}
      contentInsetAdjustmentBehavior="automatic"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.gold} />}
    >
      <Content style={styles.content}>
        {data && !data.items.length ? <EmptyState symbol="checkmark.seal" title="All clear" message="No reported messages." /> : null}
        {data?.items.map((item) => (
          <View key={item.message.id} style={styles.card}>
            <Text style={styles.where}>
              {item.message.where} · {messageTime(item.message.sentAt)}
            </Text>
            <Text style={styles.author}>{item.message.author?.name || 'Deleted account'}</Text>
            <Text style={[styles.body, !item.message.body && styles.removed]}>{item.message.body ?? 'Message already removed'}</Text>
            {item.reports.map((r) => (
              <Text key={r.id} style={styles.report}>
                Reported by {r.reporter?.name || 'a member'}
                {r.reason ? `: “${r.reason}”` : ''}
              </Text>
            ))}
            <View style={styles.actions}>
              <Button title="Dismiss" variant="secondary" style={styles.flex} onPress={() => act(item, 'dismiss')} />
              <Button title="Remove" variant="danger" style={styles.flex} onPress={() => act(item, 'remove')} />
            </View>
            {item.message.author && !item.message.author.chatBanned ? (
              <Button title="Remove and ban from chat" variant="ghost" onPress={() => act(item, 'remove_and_ban')} />
            ) : null}
          </View>
        ))}

        {data?.banned.length ? (
          <ListGroup title="Banned from chat">
            {data.banned.map((m) => (
              <ListRow key={m.id} title={m.name} subtitle="Tap to view and unban" onPress={() => router.push(`/admin/member/${m.id}`)} />
            ))}
          </ListGroup>
        ) : null}
      </Content>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.navy },
  content: { padding: space.lg, gap: space.lg, paddingBottom: 140 },
  card: { backgroundColor: colors.card, borderRadius: radius.lg, padding: space.lg, gap: space.sm },
  where: { color: colors.textFaint, fontSize: 13 },
  author: { color: colors.gold, fontSize: 15, fontWeight: '700' },
  body: { color: colors.text, fontSize: 16, lineHeight: 22 },
  removed: { color: colors.textFaint, fontStyle: 'italic' },
  report: { color: colors.textMuted, fontSize: 14 },
  actions: { flexDirection: 'row', gap: space.md, marginTop: space.sm },
  flex: { flex: 1 }
});
