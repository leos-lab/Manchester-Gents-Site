import { useEffect, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { api } from '../lib/api';
import { loadPhotos } from '../lib/gallery';
import { BackupImage } from './BackupImage';
import { colors, radius, space } from '../theme';

// A row of the event's latest photos that opens the full gallery.
export function GalleryStrip({ eventId, onOpen }) {
  const [photos, setPhotos] = useState(null);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    let cancelled = false;
    api
      .gallery(eventId)
      .then(({ gallery }) => loadPhotos(gallery, 1))
      .then((result) => {
        if (cancelled) return;
        setPhotos(result.photos.slice(0, 10));
        setTotal(result.total);
      })
      .catch(() => !cancelled && setPhotos([]));
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  if (!photos) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <Text style={styles.title}>Photos{total ? ` · ${total}` : ''}</Text>
        <Pressable onPress={onOpen} hitSlop={10} accessibilityRole="button">
          <Text style={styles.link}>{photos.length ? 'See all' : 'Add photos'}</Text>
        </Pressable>
      </View>
      {photos.length ? (
        <FlatList
          horizontal
          data={photos}
          keyExtractor={(p) => p.id}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.row}
          renderItem={({ item }) => (
            <Pressable onPress={onOpen} accessibilityRole="imagebutton" accessibilityLabel="Open gallery">
              <BackupImage uri={item.thumb} backupUri={item.backupThumb} style={styles.thumb} contentFit="cover" transition={120} />
            </Pressable>
          )}
        />
      ) : (
        <Text style={styles.empty}>No photos yet. Be the first to share some.</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.md },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: colors.gold, fontSize: 13, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' },
  link: { color: colors.gold, fontSize: 15, fontWeight: '600' },
  row: { gap: space.sm },
  thumb: { width: 120, height: 150, borderRadius: radius.sm, backgroundColor: colors.card },
  empty: { color: colors.textMuted, fontSize: 15 }
});
