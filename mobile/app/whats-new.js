import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { useAuth } from '../src/context/AuthContext';
import { api, privateImage, request, uploadToPinstripe } from '../src/lib/api';
import { pickImage } from '../src/lib/pickImage';
import { useGutter } from '../src/lib/layout';
import { Avatar } from '../src/components/Avatar';
import { Button } from '../src/components/Button';
import { Icon } from '../src/components/Icon';
import { colors, fonts, radius, space } from '../src/theme';

const UPGRADES = [
  { symbol: 'house.fill', text: 'A new Home tab with your next social, unread chats and the latest photos.' },
  { symbol: 'person.3.fill', text: 'A community chat for every member. Event chats are archived 48 hours after the social.' },
  { symbol: 'photo.on.rectangle', text: 'Send photos in chats, and share your location in messages.' },
  { symbol: 'square.and.arrow.down', text: 'Save event photos: hold one to select several, or save them all.' },
  { symbol: 'person.crop.circle', text: 'Edit your whole profile, and read the community guidelines, in the app.' }
];

// Shown once after signing in to the upgraded app: what's new, then a
// public profile photo (members' reference photos are private). Finishing
// sets avatarPromptDoneAt so it isn't shown again.
export default function WhatsNew() {
  const router = useRouter();
  const gutter = useGutter(space.xl);
  const { user, refreshMe } = useAuth();
  // Members who joined this week haven't seen the old app: skip to the photo.
  const isNew = user?.memberSince && Date.now() - new Date(user.memberSince).getTime() < 7 * 24 * 3600 * 1000;
  const [step, setStep] = useState(isNew ? 'avatar' : 'news');
  const [busy, setBusy] = useState(null);

  const finish = async (action, label) => {
    setBusy(label);
    try {
      if (action) await action();
      await api.updateMe({ avatarPromptDone: true });
      await refreshMe();
      router.back();
    } catch (e) {
      Alert.alert('Couldn’t update your photo', e.message);
      setBusy(null);
    }
  };

  const takeReferencePhoto = () => finish(() => request('/api/v1/me/avatar/from-reference', { method: 'POST' }), 'reference');

  const uploadNew = async () => {
    const asset = await pickImage({ title: 'Profile photo', message: 'Shown to other members on your profile and in chats.' });
    if (!asset) return;
    finish(async () => {
      const { upload } = await api.avatarUploadTarget();
      const photo = await uploadToPinstripe(upload, { ...asset, fileName: asset.fileName || 'avatar.jpg' });
      await api.setAvatar(photo.id);
    }, 'upload');
  };

  if (step === 'news') {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={[styles.content, gutter]}>
        <Text style={styles.title}>The app has had an upgrade</Text>
        <Text style={styles.text}>Here’s what’s new for Manchester Gents members.</Text>
        <View style={styles.list}>
          {UPGRADES.map((u) => (
            <View key={u.text} style={styles.item}>
              <Icon name={u.symbol} size={22} color={colors.gold} style={styles.itemIcon} />
              <Text style={styles.itemText}>{u.text}</Text>
            </View>
          ))}
        </View>
        <Button title="Continue" onPress={() => setStep('avatar')} />
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, gutter]}>
      <Text style={styles.title}>Add a profile photo</Text>
      <Text style={styles.text}>
        Members see it on your profile and next to your messages. Your reference photo is private to the team unless you
        choose to use it here.
      </Text>

      <View style={styles.photos}>
        {user?.avatarUrl ? (
          <View style={styles.photo}>
            <Avatar name={user.name} uri={user.avatarUrl} size={96} ring />
            <Text style={styles.caption}>Current photo</Text>
          </View>
        ) : null}
        {user?.referencePhotoUrl ? (
          <View style={styles.photo}>
            <Image source={privateImage(user.referencePhotoUrl)} style={styles.reference} contentFit="cover" />
            <Text style={styles.caption}>Reference photo</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.actions}>
        {user?.referencePhotoUrl ? (
          <Button title="Use my reference photo" onPress={takeReferencePhoto} loading={busy === 'reference'} disabled={Boolean(busy)} />
        ) : null}
        <Button
          title="Upload a new photo"
          variant={user?.referencePhotoUrl ? 'secondary' : 'primary'}
          onPress={uploadNew}
          loading={busy === 'upload'}
          disabled={Boolean(busy)}
        />
        {user?.avatarUrl ? (
          <Button title="Keep my current photo" variant="secondary" onPress={() => finish(null, 'keep')} disabled={Boolean(busy)} />
        ) : null}
        <Button
          title={user?.avatarUrl ? 'Remove my photo' : 'No profile photo for now'}
          variant="ghost"
          onPress={() => finish(user?.avatarUrl ? () => api.removeAvatar() : null, 'none')}
          disabled={Boolean(busy)}
        />
      </View>
      <Text style={styles.small}>You can change it any time from your profile.</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.navy },
  content: { padding: space.xl, gap: space.lg, paddingBottom: space.xxl },
  title: { color: colors.gold, fontFamily: fonts.heading, fontSize: 34 },
  text: { color: colors.text, fontSize: 16, lineHeight: 23 },
  list: { gap: space.md, backgroundColor: colors.card, borderRadius: radius.lg, padding: space.lg },
  item: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
  itemIcon: { width: 26, height: 26 },
  itemText: { color: colors.text, fontSize: 15, lineHeight: 21, flex: 1 },
  photos: { flexDirection: 'row', justifyContent: 'center', gap: space.xl },
  photo: { alignItems: 'center', gap: space.sm },
  reference: { width: 96, height: 96, borderRadius: 48 },
  caption: { color: colors.textMuted, fontSize: 13 },
  actions: { gap: space.md },
  small: { color: colors.textFaint, fontSize: 13, textAlign: 'center' }
});
