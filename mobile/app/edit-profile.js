import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { useAuth } from '../src/context/AuthContext';
import { api, privateImage } from '../src/lib/api';
import { pickImage } from '../src/lib/pickImage';
import { useSheetPadding } from '../src/lib/layout';
import { HeaderAction } from '../src/components/HeaderAction';
import { Field, SectionTitle, ToggleRow } from '../src/components/Form';
import { colors, radius, space } from '../src/theme';

// Everything the website's profile page edits: names, how we reach you, the
// private reference photo, plus the bio and Instagram handle members see.
export default function EditProfile() {
  const router = useRouter();
  const { user, refreshMe } = useAuth();
  const gutter = useSheetPadding(space.xl);
  const [form, setForm] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    preferredName: user?.preferredName || '',
    shareFirstName: user?.shareFirstName !== false,
    instagram: user?.instagram?.handle || '',
    phoneNumber: user?.phoneNumber || '',
    preferredContactMethod: user?.preferredContactMethod || '',
    bio: user?.bio || ''
  });
  const [photo, setPhoto] = useState(null); // newly uploaded { uri, ref }
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  const changePhoto = async () => {
    const asset = await pickImage({
      title: 'Reference photo',
      message: 'A clear photo of your face for our hosts. Only the Manchester Gents team can see it.'
    });
    if (!asset) return;
    setUploading(true);
    try {
      const { url } = await api.uploadReferencePhoto(asset);
      setPhoto({ uri: asset.uri, ref: url });
    } catch (e) {
      Alert.alert('Upload failed', e.message);
    } finally {
      setUploading(false);
    }
  };

  const save = async () => {
    if (!form.firstName.trim() || !form.lastName.trim()) {
      Alert.alert('Add your name', 'Your first and last name are needed.');
      return;
    }
    if (!form.shareFirstName && !form.preferredName.trim()) {
      Alert.alert('Add a preferred name', 'If you hide your real name, members need a name to see instead.');
      return;
    }
    setBusy(true);
    try {
      const changes = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        preferredName: form.preferredName.trim() || null,
        shareFirstName: form.shareFirstName,
        phoneNumber: form.phoneNumber.trim() || null,
        preferredContactMethod: form.preferredContactMethod.trim() || null,
        bio: form.bio.trim() || null
      };
      const handle = form.instagram.trim().replace(/^@/, '');
      if (handle && handle !== user?.instagram?.handle) changes.instagramHandle = handle;
      if (photo) changes.referencePhoto = photo.ref;
      await api.updateMe(changes);
      await refreshMe();
      router.back();
    } catch (e) {
      Alert.alert('Couldn’t save', e.message);
    } finally {
      setBusy(false);
    }
  };

  const photoSource = photo ? { uri: photo.uri } : privateImage(user?.referencePhotoUrl);

  return (
    // In a form sheet, KeyboardAvoidingView mis-measures and leaves the sheet
    // blank; the scroll view makes room for the keyboard itself.
    <>
      <Stack.Screen options={{ headerRight: () => <HeaderAction title="Save" onPress={save} busy={busy} disabled={uploading} /> }} />
      <ScrollView
        style={styles.screen}
        contentContainerStyle={[styles.content, gutter]}
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
      >
        <SectionTitle>About you</SectionTitle>
        <View style={styles.row}>
          <Field style={styles.flex} label="First name" value={form.firstName} onChangeText={set('firstName')} maxLength={60} />
          <Field style={styles.flex} label="Last name" value={form.lastName} onChangeText={set('lastName')} maxLength={60} />
        </View>
        <ToggleRow
          title="Show my real name"
          description="Members see your preferred name, or your first and last name. Off: they only see your preferred name."
          value={form.shareFirstName}
          onValueChange={set('shareFirstName')}
        />
        <Field label="Preferred name" hint="What other members call you." value={form.preferredName} onChangeText={set('preferredName')} maxLength={60} />
        <Field label="Bio" hint={`${form.bio.length}/300 · shown on your profile`} value={form.bio} onChangeText={set('bio')} maxLength={300} multiline placeholder="A line about you" />

        <SectionTitle>Staying in touch</SectionTitle>
        <Field label="Instagram" value={form.instagram} onChangeText={set('instagram')} autoCapitalize="none" autoCorrect={false} placeholder="@yourhandle" />
        <Field label="Phone number" hint="Only the team sees this." value={form.phoneNumber} onChangeText={set('phoneNumber')} keyboardType="phone-pad" autoComplete="tel" />
        <Field label="Other way to reach you" hint="Optional, e.g. if you’re not on Instagram." value={form.preferredContactMethod} onChangeText={set('preferredContactMethod')} />
        <Text style={styles.hint}>Email: {user?.email}. Contact the team to change it.</Text>

        <SectionTitle>Reference photo</SectionTitle>
        <Text style={styles.hint}>Private: only the Manchester Gents team sees it, to welcome you at the door. Your profile photo is separate.</Text>
        <Pressable onPress={changePhoto} disabled={uploading} style={styles.photo} accessibilityRole="button" accessibilityLabel="Change reference photo">
          {photoSource ? <Image source={photoSource} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}
          <Text style={styles.photoLabel}>{uploading ? 'Uploading…' : 'Change'}</Text>
        </Pressable>

      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.navy },
  content: { padding: space.xl, gap: space.lg, paddingBottom: space.xxl },
  row: { flexDirection: 'row', gap: space.md },
  flex: { flex: 1 },
  hint: { color: colors.textMuted, fontSize: 13, lineHeight: 18 },
  photo: {
    width: 140,
    height: 140,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'flex-end',
    padding: space.sm
  },
  photoLabel: {
    color: colors.gold,
    fontWeight: '600',
    backgroundColor: 'rgba(20, 29, 41, 0.75)',
    paddingHorizontal: space.md,
    paddingVertical: 4,
    borderRadius: radius.pill,
    overflow: 'hidden'
  }
});
