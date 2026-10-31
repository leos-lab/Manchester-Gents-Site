// Event photo galleries come straight from the Pinstripe API, the same way the
// website loads them. /api/v1/events/:id/gallery says which gallery to use.
import { Directory, File, Paths } from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';

const PAGE_SIZE = 60;

function galleryPath(g) {
  return `${g.apiBase}/api/sites/${encodeURIComponent(g.siteSlug)}/events/${encodeURIComponent(g.eventSlug)}`;
}

function normalise(photo) {
  const a = photo.assets?.[0] || {};
  return {
    id: String(photo.id),
    thumb: a.mediumUrl || a.displayUrl || a.thumbUrl || a.url,
    full: a.url || a.displayUrl || a.mediumUrl,
    width: photo.width || null,
    height: photo.height || null,
    uploaderName: photo.uploaderName || '',
    takenAt: photo.takenAt || photo.createdAt,
    filename: photo.originalFilename || `${photo.id}.jpg`
  };
}

async function json(res) {
  const body = await res.json().catch(() => null);
  if (!res.ok || !body?.success) throw new Error(body?.error || 'The gallery is unavailable right now.');
  return body.data;
}

export async function loadPhotos(gallery, page = 1) {
  const params = new URLSearchParams({
    status: 'uploaded',
    page: String(page),
    limit: String(PAGE_SIZE),
    createIfMissing: 'true',
    eventTitle: gallery.eventTitle,
    eventDate: gallery.eventDate
  });
  const data = await json(await fetch(`${galleryPath(gallery)}/photos?${params}`));
  const photos = (data.photos || []).map(normalise).filter((p) => p.thumb && p.full);
  return { photos, total: Number(data.total) || photos.length, hasMore: page * PAGE_SIZE < (Number(data.total) || 0) };
}

// Members can add photos, like on the website: a short-lived upload token
// from Pinstripe, then one multipart upload with the member's name attached.
export async function uploadPhotos(gallery, assets, onProgress) {
  const tokenRes = await fetch(`${gallery.apiBase}/api/public/upload-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ siteSlug: gallery.siteSlug, eventSlug: gallery.eventSlug })
  });
  const { token } = await json(tokenRes);
  onProgress?.(0.2);
  const form = new FormData();
  assets.forEach((asset, i) =>
    form.append('images[]', {
      uri: asset.uri,
      type: asset.mimeType || 'image/jpeg',
      name: asset.fileName || `photo-${Date.now()}-${i}.jpg`
    })
  );
  form.append('uploaderName', gallery.uploaderName || 'Manchester Gents member');
  form.append('source', 'app');
  const result = await json(
    await fetch(`${galleryPath(gallery)}/photos/bulk-upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form
    })
  );
  onProgress?.(1);
  return result; // { succeeded, failed, total }
}

export async function savePhotoToLibrary(photo) {
  const permission = await MediaLibrary.requestPermissionsAsync(true);
  if (!permission.granted) throw new Error('Allow photo library access in Settings to save photos.');
  const dir = new Directory(Paths.cache, 'mg-photos');
  dir.create({ idempotent: true });
  const ext = (photo.full.split('?')[0].match(/\.(jpe?g|png|webp|heic|gif)$/i)?.[1] || 'jpg').toLowerCase();
  const file = await File.downloadFileAsync(photo.full, new File(dir, `${photo.id}.${ext}`), { idempotent: true });
  await MediaLibrary.saveToLibraryAsync(file.uri);
}
