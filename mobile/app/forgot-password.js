import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../src/lib/api';
import { useSheetPadding } from '../src/lib/layout';
import { Button } from '../src/components/Button';
import { colors, radius, space } from '../src/theme';
import { useKeyboardDone } from '../src/components/KeyboardDone';

// Emails a reset link (the same one the website sends); the link opens the
// website's reset page.
export default function ForgotPassword() {
  const keyboard = useKeyboardDone();
  const router = useRouter();
  const gutter = useSheetPadding(space.xl);
  const [identifier, setIdentifier] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState(null);

  const submit = async () => {
    if (identifier.trim().length < 2) {
      setError('Enter your email or Instagram handle.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await api.forgotPassword(identifier.trim());
      setSent(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, gutter]} keyboardShouldPersistTaps="handled">
      {sent ? (
        <View style={styles.done}>
          <Text style={styles.text}>
            If there’s an account for {identifier.trim()}, we’ve emailed a link to reset your password. It may take a minute
            to arrive.
          </Text>
          <Button title="Done" onPress={() => router.back()} />
        </View>
      ) : (
        <>
          <Text style={styles.text}>Enter the email or Instagram handle you joined with and we’ll email you a reset link.</Text>
          <TextInput
              {...keyboard.inputProps}
            style={styles.input}
            placeholder="Email or Instagram handle"
            placeholderTextColor={colors.textFaint}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="username"
            keyboardType="email-address"
            value={identifier}
            onChangeText={setIdentifier}
            returnKeyType="send"
            onSubmitEditing={submit}
            autoFocus
          />
            {keyboard.bar}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          <Button title="Email me a link" onPress={submit} loading={busy} />
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.navy },
  content: { padding: space.xl, gap: space.lg },
  done: { gap: space.xl },
  text: { color: colors.text, fontSize: 16, lineHeight: 23 },
  input: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    color: colors.text,
    fontSize: 17,
    paddingHorizontal: space.lg,
    paddingVertical: 15
  },
  error: { color: colors.danger, fontSize: 15 }
});
