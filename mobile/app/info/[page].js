import { useState } from 'react';
import { ActivityIndicator, Alert, Linking, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { api } from '../../src/lib/api';
import { useAuth } from '../../src/context/AuthContext';
import { useContent } from '../../src/lib/content';
import { useSheetPadding } from '../../src/lib/layout';
import { Button } from '../../src/components/Button';
import { colors, fonts, radius, space } from '../../src/theme';

// Community guidelines, privacy policy and photography notice, from the same
// copy the website uses (lib/consentContent.js via /api/v1/content).
export default function InfoPage() {
  const { page, accept } = useLocalSearchParams();
  const router = useRouter();
  const { signedIn, refreshMe } = useAuth();
  const gutter = useSheetPadding(space.xl);
  const { content, error, retry } = useContent();
  const [saving, setSaving] = useState(false);

  // ?accept=1 (from Profile): members re-accept updated guidelines here.
  const agree = async () => {
    setSaving(true);
    try {
      await api.updateMe({ acceptTerms: true });
      await refreshMe();
      router.back();
    } catch (e) {
      Alert.alert('Couldn’t save', e.message);
      setSaving(false);
    }
  };

  if (!content) {
    return (
      <View style={[styles.screen, styles.center]}>
        {error ? <Button title="Try again" variant="secondary" onPress={retry} /> : <ActivityIndicator color={colors.gold} />}
      </View>
    );
  }

  const { title, intro, items, paragraphs, footer } = describe(page, content);
  return (
    <>
      <Stack.Screen options={{ title }} />
      <ScrollView style={styles.screen} contentContainerStyle={[styles.content, gutter]}>
        {intro ? <Text style={styles.intro}>{intro}</Text> : null}
        {items?.map((item) => (
          <View key={item.key} style={styles.item}>
            <Text style={styles.itemTitle}>{item.title}</Text>
            <Text style={styles.text}>{item.description}</Text>
          </View>
        ))}
        {paragraphs?.map((text) => (
          <Text key={text} style={styles.text}>
            {text}
          </Text>
        ))}
        {footer}
        {accept && signedIn && page === 'guidelines' ? <Button title="I agree to all five" onPress={agree} loading={saving} /> : null}
      </ScrollView>
    </>
  );
}

function describe(page, content) {
  if (page === 'privacy') return { title: content.privacy.title, paragraphs: content.privacy.paragraphs };
  if (page === 'photography') {
    const { title, paragraphs, contact } = content.photographyNotice;
    return {
      title,
      paragraphs,
      footer: (
        <Text style={styles.text}>
          Questions? Email{' '}
          <Text style={styles.link} onPress={() => Linking.openURL(`mailto:${contact.email}`)}>
            {contact.email}
          </Text>
          .
        </Text>
      )
    };
  }
  return {
    title: 'Community guidelines',
    intro: 'Every member agrees to these when they join. They keep Manchester Gents a safe, welcoming space.',
    items: content.guidelines
  };
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.navy },
  center: { alignItems: 'center', justifyContent: 'center' },
  content: { padding: space.xl, gap: space.lg, paddingBottom: space.xxl },
  intro: { color: colors.textMuted, fontSize: 16, lineHeight: 23 },
  item: { backgroundColor: colors.card, borderRadius: radius.md, padding: space.lg, gap: space.xs },
  itemTitle: { color: colors.gold, fontFamily: fonts.heading, fontSize: 22 },
  text: { color: colors.text, fontSize: 16, lineHeight: 24 },
  link: { color: colors.gold, fontWeight: '600' }
});
