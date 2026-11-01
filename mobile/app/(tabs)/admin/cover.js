import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
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

// Choose an event's cover from its photos: Event assets (admin-only) first,
// then the members' gallery. Covers show 16:9 everywhere, so the tiles do too.
export default function CoverPicker() {
  const { eventId, current } = useLocalSearchParams();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const gutter = useSheetPadding(space.lg);
  const [sections, setSections] = useState(null);
  const [saving, setSaving] = useState(null); // url being set
  const [uploading, setUploading] = useState(false);

  // Reloads on focus, so photos just added to Event assets show up.
  useFocusEffect(
    useCallback(() => {
      const load = async (assets) => {
        try {
          const { gallery } = await api.gallery(eventId, { assets });
          return (await loadPhotos(gallery, 1)).photos;
        } catch {
          return [];
        }
      };
      Promise.all([load(true), load(false)]).then(([assets, gallery]) => setSections({ assets, gallery }));
    }, [eventId])
  );

  const setCover = async (url) => {
    setSaving(url ?? 'remove');
    try {
      await api.admin.setCover(eventId, url);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      router.back();
    } catch (e) {
      Alert.alert('Couldn’t change the cover', e.message);
      setSaving(null);
    }
  };

  // A new photo from the library: into Event assets, then made the cover. All
  // in this sheet (opening the gallery from a sheet would land behind it).
  const uploadCover = async () => {
    const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9, ...COMPATIBLE_PHOTOS });
    if (picked.canceled || !picked.assets?.[0]) return;
    setUploading(true);
    try {
      const { gallery } = await api.gallery(eventId, { assets: true });
      await loadPhotos(gallery, 1); // makes sure the Event assets gallery exists
      const outcome = await uploadPhotos(gallery, [picked.assets[0]], undefined, gallery.uploaderName);
      const photo = outcome.succeeded?.[0] ? normalise(outcome.succeeded[0]) : null;
      if (!photo) throw new Error(outcome.failed?.[0]?.error || 'The photo didn’t upload.');
      await setCover(photo.full || photo.medium || photo.thumb);
    } catch (e) {
      Alert.alert('Couldn’t upload the cover', e.message);
    } finally {
      setUploading(false);
    }
  };

  const inner = width - (gutter.paddingLeft ?? space.lg) - (gutter.paddingRight ?? space.lg);
  const tile = Math.floor((inner - GAP * (COLUMNS - 1)) / COLUMNS);

  const grid = (photos) => (
    <View style={styles.grid}>
      {photos.map((p) => {
        const url = p.full || p.medium || p.thumb;
        const chosen = current && current === url;
        return (
          <Pressable
            key={p.id}
            onPress={() => setCover(url)}
            disabled={Boolean(saving)}
            style={({ pressed }) => [styles.tile, { width: tile }, chosen && styles.chosen, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel="Use this photo as the cover"
          >
            <Image source={{ uri: p.thumb }} style={StyleSheet.absoluteFill} contentFit="cover" transition={150} />
            {saving === url ? <ActivityIndicator style={StyleSheet.absoluteFill} color={colors.gold} /> : null}
          </Pressable>
        );
      })}
    </View>
  );

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.content, gutter]} contentInsetAdjustmentBehavior="never">
      <Text style={styles.heading}>Event assets</Text>
      {!sections ? (
        <ActivityIndicator color={colors.gold} style={styles.loading} />
      ) : sections.assets.length ? (
        grid(sections.assets)
      ) : (
        <Text style={styles.hint}>Nothing here yet. Upload a cover below: it’s kept in Event assets, which only admins see.</Text>
      )}
      <Button title="Upload a new cover" variant="secondary" onPress={uploadCover} loading={uploading} disabled={Boolean(saving)} />

      {sections?.gallery.length ? (
        <>
          <Text style={styles.heading}>Gallery</Text>
          {grid(sections.gallery)}
        </>
      ) : null}

      {current ? <Button title="Remove cover" variant="danger" onPress={() => setCover(null)} loading={saving === 'remove'} /> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.navy },
  content: { paddingTop: space.lg, paddingBottom: space.xl * 2, gap: space.md },
  heading: { color: colors.text, fontSize: 17, fontWeight: '700', marginTop: space.sm },
  hint: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  loading: { marginVertical: space.lg },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: GAP },
  tile: { aspectRatio: 16 / 9, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.card },
  chosen: { borderWidth: 2, borderColor: colors.gold },
  pressed: { opacity: 0.7 }
});
