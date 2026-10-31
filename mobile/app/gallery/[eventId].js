import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  Share,
  StyleSheet,
  Text,
  View,
  useWindowDimensions
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../../src/lib/api';
import { loadPhotos, savePhotoToLibrary, uploadPhotos } from '../../src/lib/gallery';
import { EmptyState } from '../../src/components/EmptyState';
import { Button } from '../../src/components/Button';
import { Glass } from '../../src/components/Glass';
import { Icon } from '../../src/components/Icon';
import { colors, space, WIDE_BREAKPOINT } from '../../src/theme';
import { BackupImage } from '../../src/components/BackupImage';
import { UploaderPrompt } from '../../src/components/UploaderPrompt';
import { useAuth } from '../../src/context/AuthContext';

const GAP = 2;

export default function Gallery() {
  const { eventId } = useLocalSearchParams();
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [gallery, setGallery] = useState(null);
  const [photos, setPhotos] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [viewerIndex, setViewerIndex] = useState(null);
  const [pending, setPending] = useState(null); // picked photos awaiting a name
  // Select mode (long-press a photo, or "Select"): save several or all.
  const [selecting, setSelecting] = useState(false);
  const [selected, setSelected] = useState(() => new Set());
  const [saving, setSaving] = useState(null); // { done, total }
  const { user } = useAuth();

  const columns = width >= WIDE_BREAKPOINT ? 5 : 3;
  // Leave room for the Duo's folded-state rail (see src/lib/layout.js).
  const tile = Math.floor((width - insets.left - insets.right - GAP * (columns - 1)) / columns);

  const loadFirst = useCallback(async () => {
    try {
      const { gallery: g } = await api.gallery(eventId);
      setGallery(g);
      const result = await loadPhotos(g, 1);
      setPhotos(result.photos);
      setTotal(result.total);
      setHasMore(result.hasMore);
      setPage(1);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    loadFirst();
  }, [loadFirst]);

  const loadMore = async () => {
    if (!gallery || !hasMore || loading) return;
    setLoading(true);
    try {
      const result = await loadPhotos(gallery, page + 1);
      setPhotos((list) => [...list, ...result.photos.filter((p) => !list.some((q) => q.id === p.id))]);
      setHasMore(result.hasMore);
      setPage(page + 1);
    } catch {
      // keep what we have
    } finally {
      setLoading(false);
    }
  };

  const startSelecting = (photo) => {
    Haptics.selectionAsync().catch(() => {});
    setSelecting(true);
    setSelected(new Set(photo ? [photo.id] : []));
  };

  const stopSelecting = () => {
    setSelecting(false);
    setSelected(new Set());
  };

  const toggle = (photo) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(photo.id)) next.delete(photo.id);
      else next.add(photo.id);
      return next;
    });

  // Saves originals to the photo library one at a time, with progress.
  const saveMany = async (list) => {
    let failed = 0;
    setSaving({ done: 0, total: list.length });
    for (const [i, photo] of list.entries()) {
      try {
        await savePhotoToLibrary(photo);
      } catch (e) {
        failed += 1;
        if (i === 0 && /access/i.test(e.message)) {
          setSaving(null);
          Alert.alert('Couldn’t save', e.message);
          return;
        }
      }
      setSaving({ done: i + 1, total: list.length });
    }
    setSaving(null);
    stopSelecting();
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    const saved = list.length - failed;
    Alert.alert(
      `Saved ${saved} ${saved === 1 ? 'photo' : 'photos'} to Photos`,
      failed ? `${failed} couldn’t be saved. Try those again in a moment.` : undefined
    );
  };

  const saveSelected = () => saveMany(photos.filter((p) => selected.has(p.id)));

  // Every photo in the gallery, loading any pages not shown yet.
  const saveAll = () =>
    Alert.alert(`Save all ${total} photos?`, 'They’ll be added to your photo library.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Save all',
        onPress: async () => {
          let all = photos;
          let next = page + 1;
          let more = hasMore;
          setSaving({ done: 0, total });
          try {
            while (more) {
              const result = await loadPhotos(gallery, next);
              all = [...all, ...result.photos.filter((p) => !all.some((q) => q.id === p.id))];
              more = result.hasMore;
              next += 1;
            }
          } catch {
            // save what we have
          }
          await saveMany(all);
        }
      }
    ]);

  const addPhotos = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 30,
      quality: 0.9,
      exif: false
    });
    if (result.canceled || !result.assets?.length) return;
    setPending(result.assets); // ask who to credit first (UploaderPrompt)
  };

  const upload = async (uploaderName) => {
    const assets = pending;
    setPending(null);
    setUploading(true);
    try {
      const outcome = await uploadPhotos(gallery, assets, undefined, uploaderName);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      if (outcome.failed?.length) {
        Alert.alert('Some photos didn’t upload', `${outcome.succeeded.length} added, ${outcome.failed.length} failed.`);
      }
      await loadFirst();
    } catch (e) {
      Alert.alert('Upload failed', e.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: gallery?.eventTitle || 'Photos',
          headerRight: gallery
            ? () =>
                selecting ? (
                  <Pressable onPress={stopSelecting} hitSlop={12} accessibilityRole="button">
                    <Text style={styles.headerAction}>Cancel</Text>
                  </Pressable>
                ) : (
                  <View style={styles.headerActions}>
                    {photos.length ? (
                      <Pressable onPress={() => startSelecting(null)} hitSlop={12} accessibilityRole="button" accessibilityLabel="Select photos to save">
                        <Text style={styles.headerAction}>Select</Text>
                      </Pressable>
                    ) : null}
                    <Pressable onPress={addPhotos} disabled={uploading} hitSlop={12} accessibilityRole="button" accessibilityLabel="Add photos">
                      {uploading ? (
                        <ActivityIndicator color={colors.gold} />
                      ) : Platform.OS === 'ios' ? (
                        <Icon name="plus" size={22} color={colors.gold} />
                      ) : (
                        <Text style={styles.headerAction}>Add</Text>
                      )}
                    </Pressable>
                  </View>
                )
            : undefined
        }}
      />
      <FlatList
        key={columns}
        style={styles.screen}
        contentInsetAdjustmentBehavior="automatic"
        data={photos}
        numColumns={columns}
        keyExtractor={(p) => p.id}
        columnWrapperStyle={{ gap: GAP }}
        contentContainerStyle={{ gap: GAP, paddingBottom: 80, paddingLeft: insets.left, paddingRight: insets.right }}
        onEndReached={loadMore}
        onEndReachedThreshold={0.6}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={async () => { setRefreshing(true); await loadFirst(); setRefreshing(false); }} tintColor={colors.gold} />}
        ListHeaderComponent={total ? <Text style={styles.count}>{total} photos</Text> : null}
        renderItem={({ item, index }) => (
          <Pressable
            onPress={() => (selecting ? toggle(item) : setViewerIndex(index))}
            onLongPress={() => (selecting ? toggle(item) : startSelecting(item))}
            delayLongPress={300}
            accessibilityRole="imagebutton"
            accessibilityState={selecting ? { selected: selected.has(item.id) } : undefined}
            accessibilityLabel={`Photo ${index + 1}${item.uploaderName ? ` by ${item.uploaderName}` : ''}`}
            accessibilityHint={selecting ? 'Double-tap to select or deselect' : 'Hold to select photos to save'}
          >
            <BackupImage uri={item.thumb} backupUri={item.backupThumb} style={{ width: tile, height: tile }} contentFit="cover" recyclingKey={item.id} transition={120} />
            {selecting ? (
              <View style={[StyleSheet.absoluteFill, selected.has(item.id) && styles.tileSelected]}>
                <View style={[styles.check, selected.has(item.id) && styles.checkOn]}>
                  {selected.has(item.id) ? <Icon name="checkmark" size={13} color={colors.navy} /> : null}
                </View>
              </View>
            ) : null}
          </Pressable>
        )}
        ListFooterComponent={loading && photos.length ? <ActivityIndicator color={colors.gold} style={styles.more} /> : null}
        ListEmptyComponent={
          loading ? (
            <ActivityIndicator color={colors.gold} style={styles.more} />
          ) : error ? (
            <EmptyState symbol="photo.on.rectangle.angled" title="Gallery unavailable" message={error}>
              <Button title="Try again" variant="secondary" onPress={loadFirst} />
            </EmptyState>
          ) : (
            <EmptyState symbol="camera" title="No photos yet" message="Got some from the night? Add them for everyone.">
              <Button title="Add photos" onPress={addPhotos} loading={uploading} />
            </EmptyState>
          )
        }
      />
      {selecting || saving ? (
        <Glass style={[styles.selectBar, { bottom: insets.bottom + space.md, left: insets.left + space.md, right: insets.right + space.md }]}>
          {saving ? (
            <>
              <ActivityIndicator color={colors.gold} />
              <Text style={styles.selectText}>
                Saving {saving.done} of {saving.total}…
              </Text>
            </>
          ) : (
            <>
              <Pressable onPress={saveAll} hitSlop={8} accessibilityRole="button">
                <Text style={styles.headerAction}>Save all {total}</Text>
              </Pressable>
              <Text style={styles.selectText}>{selected.size ? `${selected.size} selected` : 'Tap photos to select'}</Text>
              <Pressable onPress={saveSelected} disabled={!selected.size} hitSlop={8} accessibilityRole="button">
                <Text style={[styles.headerAction, !selected.size && styles.disabled]}>Save</Text>
              </Pressable>
            </>
          )}
        </Glass>
      ) : null}
      <Viewer photos={photos} index={viewerIndex} onClose={() => setViewerIndex(null)} />
      <UploaderPrompt visible={Boolean(pending)} count={pending?.length || 0} user={user} onUpload={upload} onCancel={() => setPending(null)} />
    </>
  );
}

function Viewer({ photos, index, onClose }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const [current, setCurrent] = useState(index ?? 0);
  const [saving, setSaving] = useState(false);
  const listRef = useRef(null);

  useEffect(() => {
    if (index !== null) setCurrent(index);
  }, [index]);

  const photo = photos[current];

  const save = async () => {
    if (!photo) return;
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

  return (
    <Modal visible={index !== null} animationType="fade" onRequestClose={onClose} supportedOrientations={['portrait', 'landscape']} statusBarTranslucent>
      <View style={styles.viewer}>
        {index !== null ? (
          <FlatList
            ref={listRef}
            horizontal
            pagingEnabled
            data={photos}
            initialScrollIndex={index}
            getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
            keyExtractor={(p) => p.id}
            showsHorizontalScrollIndicator={false}
            onMomentumScrollEnd={(e) => setCurrent(Math.round(e.nativeEvent.contentOffset.x / width))}
            renderItem={({ item }) => (
              <Pressable onPress={onClose} style={{ width, height }} accessibilityLabel="Close photo">
                <BackupImage uri={item.full} backupUri={item.backupFull} placeholder={{ uri: item.thumb }} style={{ width, height }} contentFit="contain" transition={150} />
              </Pressable>
            )}
          />
        ) : null}
        <Glass style={[styles.viewerBar, { top: insets.top + space.sm, left: insets.left + space.md, right: insets.right + space.md }]}>
          <Pressable onPress={onClose} hitSlop={10} accessibilityRole="button" accessibilityLabel="Close">
            <Text style={styles.viewerAction}>Done</Text>
          </Pressable>
          <Text style={styles.viewerCount}>{photos.length ? `${current + 1} of ${photos.length}` : ''}</Text>
          <View style={styles.viewerButtons}>
            <Pressable onPress={() => photo && Share.share({ url: photo.original, message: Platform.OS === 'android' ? photo.original : undefined })} hitSlop={10} accessibilityRole="button" accessibilityLabel="Share photo">
              <Text style={styles.viewerAction}>Share</Text>
            </Pressable>
            <Pressable onPress={save} disabled={saving} hitSlop={10} accessibilityRole="button" accessibilityLabel="Save to Photos">
              <Text style={styles.viewerAction}>{saving ? 'Saving…' : 'Save'}</Text>
            </Pressable>
          </View>
        </Glass>
        {photo?.uploaderName ? (
          <Glass style={[styles.caption, { bottom: insets.bottom + space.lg }]}>
            <Text style={styles.captionText}>Shared by {photo.uploaderName}</Text>
          </Glass>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: space.lg },
  tileSelected: { backgroundColor: 'rgba(20, 29, 41, 0.35)', borderWidth: 3, borderColor: colors.gold },
  check: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.text,
    backgroundColor: 'rgba(20, 29, 41, 0.4)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  checkOn: { backgroundColor: colors.gold, borderColor: colors.gold },
  selectBar: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space.md,
    borderRadius: 22,
    paddingHorizontal: space.lg,
    paddingVertical: space.md
  },
  selectText: { color: colors.text, fontSize: 15, flexShrink: 1, textAlign: 'center' },
  disabled: { opacity: 0.4 },
  screen: { flex: 1, backgroundColor: colors.navy },
  count: { color: colors.textMuted, fontSize: 13, padding: space.md },
  more: { marginVertical: space.xl },
  headerAction: { color: colors.gold, fontWeight: '600' },
  viewer: { flex: 1, backgroundColor: '#000' },
  viewerBar: {
    position: 'absolute',
    left: space.md,
    right: space.md,
    borderRadius: 22,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    overflow: 'hidden'
  },
  viewerButtons: { flexDirection: 'row', gap: space.lg },
  viewerAction: { color: colors.gold, fontSize: 16, fontWeight: '600' },
  viewerCount: { color: colors.text, fontSize: 15 },
  caption: { position: 'absolute', alignSelf: 'center', borderRadius: 18, paddingHorizontal: space.lg, paddingVertical: space.sm, overflow: 'hidden' },
  captionText: { color: colors.text, fontSize: 14 }
});
