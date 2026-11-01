import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { api } from '../src/lib/api';
import { loadContent } from '../src/lib/content';
import { useAuth } from '../src/context/AuthContext';
import { useSheetPadding } from '../src/lib/layout';
import { Button } from '../src/components/Button';
import { Field } from '../src/components/Form';
import { Icon } from '../src/components/Icon';
import { colors, radius, space } from '../src/theme';

// Reserving a spot, in two steps: a reminder of the community guidelines (and
// the photography notice when admins have it switched on) to confirm, then an
// optional note for the hosts.
export default function ConfirmRsvp() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const gutter = useSheetPadding(space.lg);
  const { user, refreshMe } = useAuth();
  const [content, setContent] = useState(null);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState('guidelines'); // then 'note'
  const [note, setNote] = useState('');

  useEffect(() => {
    loadContent()
      .then(setContent)
      .catch(() => setContent({ guidelines: [], photographyNotice: { required: false } }));
  }, []);

  const notice = content?.photographyNotice;
  const agreedAt = user?.photoNoticeAgreedAt ? new Date(user.photoNoticeAgreedAt) : null;
  // Shown (and agreed to by confirming) when it's on and they haven't
  // accepted this version of it yet.
  const needsNotice = Boolean(notice?.required) && !(agreedAt && (!notice.updatedAt || agreedAt >= new Date(notice.updatedAt)));

  const reserve = async () => {
    setBusy(true);
    try {
      if (needsNotice) {
        await api.updateMe({ photoNoticeAgreed: true });
        await refreshMe().catch(() => {});
      }
      await api.rsvp(id, note.trim());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      router.back();
    } catch (e) {
      Alert.alert('Couldn’t reserve your spot', e.message);
      setBusy(false);
    }
  };

  if (step === 'note') {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={[styles.content, gutter]} contentInsetAdjustmentBehavior="never" keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets>
        <Stack.Screen options={{ title: 'A note for the hosts' }} />
        <Text style={styles.lede}>Anything the hosts should know: dietary needs, accessibility, or that you’re bringing a friend to join. Optional.</Text>
        <Field label="Note for the hosts" value={note} onChangeText={setNote} multiline maxLength={500} placeholder="Optional" autoFocus />
        <Button title="Reserve my spot" onPress={reserve} loading={busy} />
        <Button title="Back" variant="secondary" onPress={() => setStep('guidelines')} disabled={busy} />
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, gutter]} contentInsetAdjustmentBehavior="never">
      <Stack.Screen options={{ title: 'Before you RSVP' }} />
      <Text style={styles.lede}>A quick reminder of what every gent agrees to. By confirming, you agree to them for this social.</Text>
      {(content?.guidelines || []).map((g) => (
        <View key={g.key} style={styles.item}>
          <Icon name="checkmark.seal.fill" size={18} color={colors.gold} style={styles.icon} />
          <View style={styles.itemText}>
            <Text style={styles.title}>{g.title}</Text>
            <Text style={styles.body}>{g.description}</Text>
          </View>
        </View>
      ))}
      {needsNotice ? (
        <View style={styles.notice}>
          <Text style={styles.title}>{notice.title}</Text>
          {notice.paragraphs.map((p, i) => (
            <Text key={i} style={styles.body}>
              {p}
            </Text>
          ))}
        </View>
      ) : null}
      <Text style={styles.link} onPress={() => router.push('/info/guidelines')} accessibilityRole="link">
        Read the full community guidelines
      </Text>
      <Button title="Confirm my spot" onPress={() => setStep('note')} disabled={!content} />
      <Button title="Not now" variant="secondary" onPress={() => router.back()} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.navy },
  content: { paddingTop: space.lg, paddingBottom: space.xl * 2, gap: space.md },
  lede: { color: colors.textMuted, fontSize: 15, lineHeight: 21 },
  item: { flexDirection: 'row', gap: space.md, backgroundColor: colors.card, borderRadius: radius.lg, padding: space.md },
  icon: { marginTop: 2 },
  itemText: { flex: 1, gap: 4 },
  title: { color: colors.text, fontSize: 16, fontWeight: '700' },
  body: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  notice: { gap: space.sm, borderRadius: radius.lg, padding: space.md, borderWidth: 1, borderColor: 'rgba(255, 212, 96, 0.4)' },
  link: { color: colors.gold, fontSize: 15, textAlign: 'center', paddingVertical: space.sm }
});
