import { useCallback, useState } from 'react';
import { ActionSheetIOS, Alert, Linking, Platform, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { useAuth } from '../../../src/context/AuthContext';
import { api, uploadToPinstripe } from '../../../src/lib/api';
import { memberSince } from '../../../src/lib/format';
import { API_URL } from '../../../src/config';
import { Avatar } from '../../../src/components/Avatar';
import { Button } from '../../../src/components/Button';
import { Chip } from '../../../src/components/Chip';
import { Content } from '../../../src/components/Content';
import { Stat, openInstagram } from '../../../src/components/ProfileBits';
import { colors, fonts, radius, space } from '../../../src/theme';

export default function Profile() {
  const router = useRouter();
  const { user, refreshMe, signOut } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      refreshMe().catch(() => {});
    }, [refreshMe])
  );

  const pickAvatar = async (source) => {
    const options = { mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.85 };
    if (source === 'camera') {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) return;
    }
    const result =
      source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    setUploading(true);
    try {
      const { upload } = await api.avatarUploadTarget();
      const photo = await uploadToPinstripe(upload, {
        uri: asset.uri,
        mimeType: asset.mimeType || 'image/jpeg',
        fileName: asset.fileName || 'avatar.jpg'
      });
      await api.setAvatar(photo.id);
      await refreshMe();
    } catch (e) {
      Alert.alert('Couldn’t update your photo', e.message);
    } finally {
      setUploading(false);
    }
  };

  const changeAvatar = () => {
    const actions = [
      { label: 'Choose from library', run: () => pickAvatar('library') },
      { label: 'Take photo', run: () => pickAvatar('camera') }
    ];
    if (user?.avatarUrl) {
      actions.push({
        label: 'Remove photo',
        destructive: true,
        run: () => api.removeAvatar().then(refreshMe).catch((e) => Alert.alert('Couldn’t remove photo', e.message))
      });
    }
    if (Platform.OS === 'ios') {
      const labels = [...actions.map((a) => a.label), 'Cancel'];
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: labels,
          cancelButtonIndex: labels.length - 1,
          destructiveButtonIndex: actions.findIndex((a) => a.destructive),
          title: 'Profile photo',
          message: 'Shown to other members on your profile and in chats.',
          userInterfaceStyle: 'dark'
        },
        (i) => actions[i]?.run()
      );
    } else {
      Alert.alert('Profile photo', 'Shown to other members on your profile and in chats.', [
        ...actions.map((a) => ({ text: a.label, style: a.destructive ? 'destructive' : 'default', onPress: a.run })),
        { text: 'Cancel', style: 'cancel' }
      ]);
    }
  };

  const confirmSignOut = () =>
    Alert.alert('Sign out?', undefined, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: signOut }
    ]);

  if (!user) return <View style={styles.screen} />;

  return (
    <ScrollView
      style={styles.screen}
      contentInsetAdjustmentBehavior="automatic"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            await refreshMe().catch(() => {});
            setRefreshing(false);
          }}
          tintColor={colors.gold}
        />
      }
    >
      <Content style={styles.content}>
        <Pressable onPress={changeAvatar} disabled={uploading} accessibilityRole="button" accessibilityLabel="Change profile photo" style={styles.avatarWrap}>
          <Avatar name={user.name} uri={user.avatarUrl} size={120} ring />
          <Text style={styles.avatarHint}>{uploading ? 'Uploading…' : user.avatarUrl ? 'Change photo' : 'Add a photo'}</Text>
        </Pressable>

        <Text style={styles.name}>{user.name}</Text>
        {user.instagram ? (
          <Chip label={`@${user.instagram.handle}`} symbol="camera" onPress={() => openInstagram(user.instagram)} />
        ) : null}

        <View style={styles.stats}>
          <Stat value={user.eventsAttended ?? 0} label={user.eventsAttended === 1 ? 'Event attended' : 'Events attended'} />
          <View style={styles.divider} />
          <Stat value={user.memberSince ? memberSince(user.memberSince) : '—'} label="Member since" small />
        </View>

        {user.bio ? <Text style={styles.bio}>{user.bio}</Text> : null}

        <View style={styles.group}>
          <Row label="Edit profile" onPress={() => router.push('/edit-profile')} />
          <Row label="Privacy & photo consents" onPress={() => Linking.openURL(`${API_URL}/profile`)} external />
          <Row label="Community guidelines" onPress={() => Linking.openURL(`${API_URL}/privacy`)} external />
        </View>

        <View style={styles.group}>
          <Button title="Sign out" variant="secondary" onPress={confirmSignOut} />
          <Button title="Delete account" variant="ghost" onPress={() => router.push('/delete-account')} />
        </View>
      </Content>
    </ScrollView>
  );
}

function Row({ label, onPress, external }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.row, pressed && styles.rowPressed]} accessibilityRole={external ? 'link' : 'button'}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowChevron}>{external ? '↗' : '›'}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.navy },
  content: { alignItems: 'center', padding: space.xl, gap: space.lg, paddingBottom: 140 },
  avatarWrap: { alignItems: 'center', gap: space.sm },
  avatarHint: { color: colors.gold, fontSize: 14, fontWeight: '600' },
  name: { color: colors.gold, fontFamily: fonts.heading, fontSize: 36, textAlign: 'center' },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    paddingVertical: space.lg,
    paddingHorizontal: space.xl,
    gap: space.xl
  },
  divider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', backgroundColor: colors.border },
  bio: { color: colors.text, fontSize: 16, lineHeight: 23, textAlign: 'center' },
  group: { alignSelf: 'stretch', gap: space.sm, marginTop: space.md },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingHorizontal: space.lg,
    paddingVertical: 16
  },
  rowPressed: { backgroundColor: colors.cardPressed },
  rowLabel: { color: colors.text, fontSize: 16 },
  rowChevron: { color: colors.textFaint, fontSize: 18 }
});
