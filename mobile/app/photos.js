import { useRef, useState } from 'react';
import { Alert, FlatList, Platform, Pressable, ScrollView, Share, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { getViewerSession, savePhotoToLibrary } from '../src/lib/gallery';
import { BackupImage } from '../src/components/BackupImage';
import { Glass } from '../src/components/Glass';
import { colors } from '../src/theme';

// Full-screen photo viewer with native toolbars: Done in the header, Share and
// Save in the bottom toolbar. Swipe between photos.
export default function PhotoViewer() {
  const router = useRouter();
  const { width, height } = useWindowDimensions();
  const [{ photos, index }] = useState(getViewerSession);
  const [current, setCurrent] = useState(index);
  const [saving, setSaving] = useState(false);
  const [zoomed, setZoomed] = useState(false); // while zoomed in, swiping pans the photo
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
      {/* Centre of the top bar: which photo, and who shared it. */}
      <Stack.Screen
        options={{
          title: photos.length ? `${current + 1} of ${photos.length}` : '',
          headerTitle: () => (
            <Glass style={styles.title}>
              <Text style={styles.count}>{photos.length ? `${current + 1} of ${photos.length}` : ''}</Text>
              {photo?.uploaderName ? (
                <Text style={styles.credit} numberOfLines={1}>
                  Shared by {photo.uploaderName}
                </Text>
              ) : null}
            </Glass>
          )
        }}
      />
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

      {/* Folding or unfolding (or rotating) changes the page width, which would
          leave the list part-way between photos. Rebuild it at the new width,
          on the photo being viewed. */}
      <FlatList
        key={`page-${Math.round(width)}`}
        horizontal
        pagingEnabled
        scrollEnabled={!zoomed}
        data={photos}
        initialScrollIndex={current}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        keyExtractor={(p) => p.id}
        showsHorizontalScrollIndicator={false}
        contentInsetAdjustmentBehavior="never"
        onMomentumScrollEnd={(e) => setCurrent(Math.round(e.nativeEvent.contentOffset.x / width))}
        renderItem={({ item }) => (
          <ZoomablePage width={width} height={height} onZoomChange={setZoomed}>
            <BackupImage
              uri={item.full}
              backupUri={item.backupFull}
              placeholder={{ uri: item.medium }}
              style={{ width, height }}
              contentFit="contain"
              transition={150}
              accessibilityLabel={item.uploaderName ? `Photo shared by ${item.uploaderName}` : 'Photo'}
            />
          </ZoomablePage>
        )}
      />
    </View>
  );
}

// Pinch to zoom (up to 4x) with iOS's own zooming scroll view; double-tap
// zooms in on that spot, or back out.
function ZoomablePage({ width, height, onZoomChange, children }) {
  const ref = useRef(null);
  const scale = useRef(1);
  const lastTap = useRef(0);

  const onDoubleTap = (e) => {
    const now = Date.now();
    if (now - lastTap.current > 280) {
      lastTap.current = now;
      return;
    }
    lastTap.current = 0;
    const zoomIn = scale.current <= 1.01;
    const { locationX: x, locationY: y } = e.nativeEvent;
    const w = zoomIn ? width / 2.5 : width;
    const h = zoomIn ? height / 2.5 : height;
    ref.current?.scrollResponderZoomTo?.({ x: zoomIn ? x - w / 2 : 0, y: zoomIn ? y - h / 2 : 0, width: w, height: h, animated: true });
  };

  return (
    <ScrollView
      ref={ref}
      style={{ width, height }}
      contentContainerStyle={{ width, height }}
      maximumZoomScale={4}
      minimumZoomScale={1}
      bouncesZoom
      centerContent
      showsHorizontalScrollIndicator={false}
      showsVerticalScrollIndicator={false}
      contentInsetAdjustmentBehavior="never"
      scrollEventThrottle={32}
      onScroll={(e) => {
        const next = e.nativeEvent.zoomScale ?? 1;
        if ((next > 1.01) !== (scale.current > 1.01)) onZoomChange(next > 1.01);
        scale.current = next;
      }}
    >
      <Pressable onPress={onDoubleTap} accessible={false}>
        {children}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000' },
  title: { alignItems: 'center', maxWidth: 260, paddingHorizontal: 16, paddingVertical: 6, borderRadius: 999, overflow: 'hidden' },
  count: { color: colors.text, fontSize: 17, fontWeight: '600' },
  credit: { color: colors.textMuted, fontSize: 12 }
});
