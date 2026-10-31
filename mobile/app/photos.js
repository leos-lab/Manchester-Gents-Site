import { useState } from 'react';
import { Alert, FlatList, Platform, Share, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getViewerSession, savePhotoToLibrary } from '../src/lib/gallery';
import { BackupImage } from '../src/components/BackupImage';
import { colors, space } from '../src/theme';

// Full-screen photo viewer with native toolbars: Done in the header, Share and
// Save in the bottom toolbar. Swipe between photos.
export default function PhotoViewer() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const [{ photos, index }] = useState(getViewerSession);
  const [current, setCurrent] = useState(index);
  const [saving, setSaving] = useState(false);
  const photo = photos[current];

  const save = async () => {
    if (!photo || saving) return;
    setSaving(true);
    try {
      await savePhotoToLibrary(photo);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      Alert.alert('Saved to Photos');
    } catch (e) {
      Alert.alert('Couldn’t save', e.message);
    } finally {
      setSaving(false);
    }
  };

  const share = () =>
    photo && Share.share({ url: photo.original, message: Platform.OS === 'android' ? photo.original : undefined }).catch(() => {});

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ title: photos.length ? `${current + 1} of ${photos.length}` : '' }} />
      {/* Top right: the secondary toolbar (on the folded iPhone Duo's rail). */}
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button onPress={() => router.back()} tintColor={colors.gold} variant="done">
          Done
        </Stack.Toolbar.Button>
      </Stack.Toolbar>
      <Stack.Toolbar placement="bottom">
        <Stack.Toolbar.Button icon="square.and.arrow.up" onPress={share} tintColor={colors.gold}>
          Share
        </Stack.Toolbar.Button>
        <Stack.Toolbar.Spacer />
        <Stack.Toolbar.Button icon="square.and.arrow.down" onPress={save} disabled={saving} tintColor={colors.gold}>
          {saving ? 'Saving' : 'Save to Photos'}
        </Stack.Toolbar.Button>
      </Stack.Toolbar>

      <FlatList
        horizontal
        pagingEnabled
        data={photos}
        initialScrollIndex={index}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        keyExtractor={(p) => p.id}
        showsHorizontalScrollIndicator={false}
        contentInsetAdjustmentBehavior="never"
        onMomentumScrollEnd={(e) => setCurrent(Math.round(e.nativeEvent.contentOffset.x / width))}
        renderItem={({ item }) => (
          <BackupImage
            uri={item.full}
            backupUri={item.backupFull}
            placeholder={{ uri: item.medium }}
            style={{ width, height }}
            contentFit="contain"
            transition={150}
            accessibilityLabel={item.uploaderName ? `Photo shared by ${item.uploaderName}` : 'Photo'}
          />
        )}
      />
      {/* Who shared it, just above the bottom toolbar: the native safe area
          includes the toolbar, so the chip sits on it wherever it is. */}
      {photo?.uploaderName ? (
        <SafeAreaView edges={['bottom', 'left', 'right']} style={styles.captionArea} pointerEvents="none">
          <Text style={styles.caption} numberOfLines={2}>
            Shared by {photo.uploaderName}
          </Text>
        </SafeAreaView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000' },
  captionArea: { position: 'absolute', left: 0, right: 0, bottom: 0, alignItems: 'center', paddingHorizontal: space.xl },
  caption: {
    color: colors.text,
    fontSize: 14,
    textAlign: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    paddingHorizontal: space.md,
    paddingVertical: 6,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: space.sm
  }
});
