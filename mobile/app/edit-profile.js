import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/context/AuthContext';
import { api } from '../src/lib/api';
import { Button } from '../src/components/Button';
import { colors, radius, space } from '../src/theme';

export default function EditProfile() {
  const router = useRouter();
  const { user, refreshMe } = useAuth();
  const [bio, setBio] = useState(user?.bio || '');
  const [preferredName, setPreferredName] = useState(user?.preferredName || '');
  const [shareFirstName, setShareFirstName] = useState(Boolean(user?.shareFirstName));
  const [instagram, setInstagram] = useState(user?.instagram?.handle || '');
  const [busy, setBusy] = useState(false);

  const save = async () => {
    setBusy(true);
    try {
      const changes = {
        bio: bio.trim() || null,
        preferredName: preferredName.trim() || null,
        shareFirstName
      };
      if (instagram.trim() && instagram.trim().replace(/^@/, '') !== user?.instagram?.handle) {
        changes.instagramHandle = instagram.trim();
      }
      await api.updateMe(changes);
      await refreshMe();
      router.back();
    } catch (e) {
      Alert.alert('Couldn’t save', e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Field label="Preferred name" hint="What other members see. Leave blank to use your first name.">
        <TextInput style={styles.input} value={preferredName} onChangeText={setPreferredName} maxLength={60} placeholder={user?.firstName || ''} placeholderTextColor={colors.textFaint} />
      </Field>
      <View style={styles.switchRow}>
        <View style={styles.flex}>
          <Text style={styles.label}>Show my full name</Text>
          <Text style={styles.hint}>Off shows only your first or preferred name.</Text>
        </View>
        <Switch value={shareFirstName} onValueChange={setShareFirstName} trackColor={{ true: colors.gold }} />
      </View>
      <Field label="Instagram">
        <TextInput style={styles.input} value={instagram} onChangeText={setInstagram} autoCapitalize="none" autoCorrect={false} placeholder="@yourhandle" placeholderTextColor={colors.textFaint} />
      </Field>
      <Field label="Bio" hint={`${bio.length}/300`}>
        <TextInput style={[styles.input, styles.bio]} value={bio} onChangeText={setBio} maxLength={300} multiline placeholder="A line about you" placeholderTextColor={colors.textFaint} />
      </Field>
      <Button title="Save" onPress={save} loading={busy} />
    </ScrollView>
  );
}

function Field({ label, hint, children }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.navy },
  content: { padding: space.xl, gap: space.xl },
  field: { gap: space.sm },
  label: { color: colors.text, fontSize: 15, fontWeight: '600' },
  hint: { color: colors.textMuted, fontSize: 13 },
  input: { backgroundColor: colors.card, borderRadius: radius.md, color: colors.text, fontSize: 16, paddingHorizontal: space.lg, paddingVertical: 13 },
  bio: { minHeight: 100, textAlignVertical: 'top' },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  flex: { flex: 1, gap: 2 }
});
