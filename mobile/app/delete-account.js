import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput } from 'react-native';
import { useAuth } from '../src/context/AuthContext';
import { Button } from '../src/components/Button';
import { colors, radius, space } from '../src/theme';
import { useSheetPadding } from '../src/lib/layout';

// In-app account deletion (required by the App Store).
export default function DeleteAccount() {
  const { deleteAccount } = useAuth();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  const confirm = () =>
    Alert.alert('Delete your account?', 'This can’t be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          try {
            await deleteAccount(password);
          } catch (e) {
            Alert.alert('Couldn’t delete your account', e.message);
            setBusy(false);
          }
        }
      }
    ]);

  return (
    <ScrollView keyboardDismissMode="interactive" style={styles.screen} contentContainerStyle={[styles.content, useSheetPadding(space.xl)]} keyboardShouldPersistTaps="handled">
      <Text style={styles.text}>
        Deleting your account removes your profile, your RSVPs, your photos and your place in event chats. Messages you’ve sent stay in
        chats without your name.
      </Text>
      <TextInput
        style={styles.input}
        placeholder="Your password"
        placeholderTextColor={colors.textFaint}
        secureTextEntry
        value={password}
        onChangeText={setPassword}
        textContentType="password"
      />
      <Button title="Delete my account" variant="danger" onPress={confirm} disabled={!password} loading={busy} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.navy },
  content: { padding: space.xl, gap: space.xl },
  text: { color: colors.text, fontSize: 16, lineHeight: 23 },
  input: { backgroundColor: colors.card, borderRadius: radius.md, color: colors.text, fontSize: 16, paddingHorizontal: space.lg, paddingVertical: 13 }
});
