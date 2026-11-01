import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { api } from '../../../src/lib/api';
import { loadPhotos, normalise, uploadPhotos } from '../../../src/lib/gallery';
import { COMPATIBLE_PHOTOS } from '../../../src/lib/filePart';
import { useSheetPadding } from '../../../src/lib/layout';
import { Button } from '../../../src/components/Button';
import { colors, radius, space } from '../../../src/theme';

const COLUMNS = 3;
const GAP = 6;
const CENTRE = { x: 50, y: 50 };

// An event's cover, in two steps:
// 1. Choose a photo from Event assets (admin-only) or the event gallery, or
//    upload a new one (it goes into Event assets).
// 2. Crop: tap the photo where the cover should centre; the preview shows the
//    16:9 cover exactly as it will appear. Nothing changes until "Use as cover".
export default function CoverPicker() {
  const { eventId, current } = useLocalSearchParams();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const padding = useSheetPadding(space.lg);
  const [sections, setSections] = useState(null);
  const [chosen, setChosen] = useState(null); // photo being cropped
  const [focus, setFocus] = useState(CENTRE);
  const [size, setSize] = useState(null); // chosen photo's pixel size
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const photos = async (assets) => {
      try {
        const { gallery } = await api.gallery(eventId, { assets });
        return (await loadPhotos(gallery, 1)).photos;
      } catch {
        return [];
      }
    };
    const [assets, gallery] = await Promise.all([photos(true), photos(false)]);
    setSections({ assets, gallery });
  }, [eventId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const choose = (photo) => {
    setChosen(photo);
    setFocus(CENTRE);
    setSize(photo.width && photo.height ? { width: photo.width, height: photo.height } : null);
  };

  const upload = async () => {
    const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9, ...COMPATIBLE_PHOTOS });
    if (picked.canceled || !picked.assets?.[0]) return;
    setUploading(true);
    try {
      const { gallery } = await api.gallery(eventId, { assets: true });
      await loadPhotos(gallery, 1); // makes sure the Event assets gallery exists
      const outcome = await uploadPhotos(gallery, [picked.assets[0]], undefined, gallery.uploaderName);
      if (!outcome.succeeded?.[0]) throw new Error(outcome.failed?.[0]?.error || 'The photo didn’t upload.');
      load();
      choose(normalise(outcome.succeeded[0]));
    } catch (e) {
      Alert.alert('Couldn’t upload the photo', e.message);
    } finally {
      setUploading(false);
    }
  };

  const save = async (url, coverFocus) => {
    setSaving(true);
    try {
      await api.admin.setCover(eventId, url, coverFocus);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      router.back();
    } catch (e) {
      Alert.alert('Couldn’t change the cover', e.message);
      setSaving(false);
    }
  };

  const inner = width - padding.paddingLeft - padding.paddingRight;

  if (chosen) {
    const url = chosen.full || chosen.medium || chosen.thumb;
    // The whole photo, as large as fits; tapping it moves the focus point.
    const ratio = size ? size.height / size.width : 3 / 4;
    const frameHeight = Math.min(inner * ratio, inner * 1.1);
    const frameWidth = frameHeight / ratio;
    return (
      <ScrollView style={styles.screen} contentContainerStyle={[styles.content, padding]} contentInsetAdjustmentBehavior="never">
        <Stack.Screen options={{ title: 'Crop cover' }} />
        <Text style={styles.hint}>Tap the part of the photo to keep in view. Covers are 16:9 everywhere, cropped around this point.</Text>
        <Pressable
          onPress={(e) => {
            const { locationX, locationY } = e.nativeEvent;
            setFocus({
              x: Math.round(Math.min(100, Math.max(0, (locationX / frameWidth) * 100))),
              y: Math.round(Math.min(100, Math.max(0, (locationY / frameHeight) * 100)))
            });
          }}
          style={[styles.frame, { width: frameWidth, height: frameHeight }]}
          accessibilityRole="adjustable"
          accessibilityLabel="Choose the point the cover centres on"
        >
          <Image
            source={{ uri: url }}
            style={StyleSheet.absoluteFill}
            contentFit="fill"
            onLoad={(e) => !size && e.source?.width && setSize({ width: e.source.width, height: e.source.height })}
          />
          <View pointerEvents="none" style={[styles.marker, { left: `${focus.x}%`, top: `${focus.y}%` }]} />
        </Pressable>
        <Text style={styles.heading}>Preview</Text>
        <View style={[styles.preview, { width: inner, height: (inner * 9) / 16 }]}>
          <Image source={{ uri: url }} style={StyleSheet.absoluteFill} contentFit="cover" contentPosition={{ left: `${focus.x}%`, top: `${focus.y}%` }} />
        </View>
        <Button title="Use as cover" onPress={() => save(url, focus)} loading={saving} />
        <Button title="Choose another photo" variant="secondary" onPress={() => setChosen(null)} disabled={saving} />
      </ScrollView>
    );
  }

  const tile = Math.floor((inner - GAP * (COLUMNS - 1)) / COLUMNS);
  const grid = (photos, empty) =>
    photos.length ? (
      <View style={styles.grid}>
        {photos.map((p) => {
          const isCurrent = current && current === (p.full || p.medium || p.thumb);
          return (
            <Pressable
              key={p.id}
              onPress={() => choose(p)}
              style={({ pressed }) => [
                styles.tile,
                { width: tile, height: Math.round((tile * 9) / 16) },
                isCurrent && styles.current,
                pressed && styles.pressed
              ]}
              accessibilityRole="button"
              accessibilityLabel={isCurrent ? 'Current cover' : 'Choose this photo'}
            >
              <Image source={{ uri: p.thumb }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
            </Pressable>
          );
        })}
      </View>
    ) : (
      <Text style={styles.hint}>{empty}</Text>
    );

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, padding]} contentInsetAdjustmentBehavior="never">
      <Stack.Screen options={{ title: 'Cover photo' }} />
      <Button title="Upload a new photo" onPress={upload} loading={uploading} />
      <Text style={styles.heading}>Event assets</Text>
      {!sections ? (
        <ActivityIndicator color={colors.gold} style={styles.loading} />
      ) : (
        grid(sections.assets, 'Nothing yet. Uploaded covers are kept here; only admins see Event assets.')
      )}
      <Text style={styles.heading}>Event gallery</Text>
      {sections ? grid(sections.gallery, 'No photos in this event’s gallery yet.') : null}
      {current ? <Button title="Remove cover" variant="danger" onPress={() => save(null, null)} loading={saving} /> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.navy },
  content: { paddingTop: space.md, gap: space.md },
  heading: { color: colors.text, fontSize: 17, fontWeight: '700', marginTop: space.sm },
  hint: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  loading: { marginVertical: space.lg },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
  tile: { borderRadius: radius.sm, overflow: 'hidden', backgroundColor: colors.card },
  current: { borderWidth: 2, borderColor: colors.gold },
  pressed: { opacity: 0.7 },
  frame: { alignSelf: 'center', borderRadius: radius.sm, overflow: 'hidden', backgroundColor: colors.card },
  marker: {
    position: 'absolute',
    width: 28,
    height: 28,
    marginLeft: -14,
    marginTop: -14,
    borderRadius: 14,
    borderWidth: 3,
    borderColor: colors.gold,
    backgroundColor: 'rgba(28, 40, 55, 0.35)'
  },
  preview: { borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.card }
});
