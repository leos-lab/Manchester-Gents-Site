import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Alert, Linking, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { api } from '../../../src/lib/api';
import { useLoader } from '../../../src/lib/useLoader';
import { messageTime } from '../../../src/lib/format';
import { Button } from '../../../src/components/Button';
import { Chip } from '../../../src/components/Chip';
import { Content } from '../../../src/components/Content';
import { EmptyState } from '../../../src/components/EmptyState';
import { ListGroup, ListRow } from '../../../src/components/ListGroup';
import { colors, radius, space } from '../../../src/theme';

const PHONE = { IOS: 'iPhone', ANDROID: 'Android' };

// Requests to join the app beta, from the website's Get the app pages.
// Approving lets the member into the dev/UAT site and app, and emails the
// install steps for their phone.
export default function AdminBeta() {
  const router = useRouter();
  const { data, refreshing, refresh, reload } = useLoader(() => api.admin.betaRequests());
  const [busy, setBusy] = useState(null);

  const act = (item, action) => {
    const approve = action === 'approve';
    Alert.alert(
      approve ? `Approve @${item.instagramHandle}?` : `Decline @${item.instagramHandle}?`,
      approve
        ? `We’ll email ${item.email} how to install the ${PHONE[item.platform]} app.${
            item.platform === 'ANDROID' ? ' Add this email to the Play Console testers list too.' : ''
          }`
        : 'They won’t be emailed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: approve ? 'Approve' : 'Decline',
          style: approve ? 'default' : 'destructive',
          onPress: async () => {
            setBusy(item.id);
            try {
              await api.admin.actOnBetaRequest(item.id, action);
              await reload();
            } catch (e) {
              Alert.alert('Couldn’t update the request', e.message);
            } finally {
              setBusy(null);
            }
          }
        }
      ]
    );
  };

  return (
    <ScrollView
      style={styles.screen}
      contentInsetAdjustmentBehavior="automatic"
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.gold} />}
    >
      <Content style={styles.content}>
        {data && !data.pending.length ? (
          <EmptyState symbol="checkmark.seal" title="All caught up" message="No one is waiting to join the beta." />
        ) : null}
        {data?.pending.map((item) => (
          <View key={item.id} style={styles.card}>
            <View style={styles.header}>
              <Text style={styles.handle}>@{item.instagramHandle}</Text>
              <Chip label={PHONE[item.platform]} tone="gold" />
            </View>
            <Pressable onPress={() => Linking.openURL(`mailto:${item.email}`)} accessibilityRole="link">
              <Text style={styles.email}>{item.email}</Text>
            </Pressable>
            {item.user ? (
              <Pressable onPress={() => router.push(`/admin/member/${item.user.id}`)} accessibilityRole="link">
                <Text style={styles.account}>
                  {item.user.instagramHandle !== item.instagramHandle ? `Account: @${item.user.instagramHandle} · ` : ''}View member
                </Text>
              </Pressable>
            ) : null}
            {item.message ? <Text style={styles.message}>“{item.message}”</Text> : null}
            <Text style={styles.when}>Asked {messageTime(item.createdAt)}</Text>
            <View style={styles.actions}>
              <Button title="Decline" variant="secondary" style={styles.flex} disabled={busy === item.id} onPress={() => act(item, 'decline')} />
              <Button title="Approve" style={styles.flex} loading={busy === item.id} onPress={() => act(item, 'approve')} />
            </View>
          </View>
        ))}

        {data?.decided.length ? (
          <ListGroup title="Decided">
            {data.decided.map((item) => (
              <ListRow
                key={item.id}
                title={`@${item.instagramHandle} · ${PHONE[item.platform]}`}
                subtitle={`${item.status === 'APPROVED' ? 'Approved' : 'Declined'} ${messageTime(item.decidedAt)} · ${item.email}`}
                onPress={
                  item.status === 'APPROVED'
                    ? () =>
                        Alert.alert('Send the install email again?', `To ${item.email}.`, [
                          { text: 'Cancel', style: 'cancel' },
                          { text: 'Send again', onPress: () => act(item, 'approve') }
                        ])
                    : undefined
                }
              />
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
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md },
  handle: { color: colors.gold, fontSize: 17, fontWeight: '700', flexShrink: 1 },
  email: { color: colors.text, fontSize: 15, textDecorationLine: 'underline' },
  account: { color: colors.gold, fontSize: 14 },
  message: { color: colors.text, fontSize: 16, lineHeight: 22, fontStyle: 'italic' },
  when: { color: colors.textFaint, fontSize: 13 },
  actions: { flexDirection: 'row', gap: space.md, marginTop: space.sm },
  flex: { flex: 1 }
});
