// Event photo galleries come straight from the Pinstripe API, the same way the
// website loads them. /api/v1/events/:id/gallery says which gallery to use.
import { Directory, File, Paths } from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { filePart } from './filePart';

const PAGE_SIZE = 60;

function galleryPath(g) {
  return `${g.apiBase}/api/sites/${encodeURIComponent(g.siteSlug)}/events/${encodeURIComponent(g.eventSlug)}`;
}

// URLs from one asset: grid, full-screen viewing, and the original (saving
// and sharing only). Pinstripe's own sizes are WebP; its 400px thumb suits the
// grid, while ImgBB's thumb is a tiny crop, so its medium size is used.
function urls(a) {
  if (!a) return { thumb: null, medium: null, full: null, original: null };
  const local = a.provider === 'local';
  return {
    thumb: (local ? a.thumbUrl : a.mediumUrl) || a.displayUrl || a.thumbUrl || a.url,
    // 1080px: for big tiles and while the full-size photo loads.
    medium: a.mediumUrl || a.displayUrl || a.url,
    full: (local ? a.displayUrl : null) || a.url || a.displayUrl || a.mediumUrl,
    original: a.url || a.displayUrl || a.mediumUrl
  };
}

// assets[0] is served by Pinstripe itself; assets[1] (ImgBB) is the backup if
// that can't be reached.
export function normalise(photo) {
  const main = urls(photo.assets?.[0]);
  const backup = urls(photo.assets?.[1]);
  return {
    id: String(photo.id),
    thumb: main.thumb,
    medium: main.medium,
    backupMedium: backup.medium,
    full: main.full,
    original: main.original,
    backupOriginal: backup.original,
    backupThumb: backup.thumb,
    backupFull: backup.full,
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
// uploaderName: who the photos are credited to (asked before uploading).
export async function uploadPhotos(gallery, assets, onProgress, uploaderName) {
  const tokenRes = await fetch(`${gallery.apiBase}/api/public/upload-token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ siteSlug: gallery.siteSlug, eventSlug: gallery.eventSlug })
  });
  const { token } = await json(tokenRes);
  onProgress?.(0.2);
  const form = new FormData();
  assets.forEach((asset, i) =>
    form.append(
      'images[]',
      filePart({ uri: asset.uri, mimeType: asset.mimeType || 'image/jpeg', fileName: asset.fileName || `photo-${Date.now()}-${i}.jpg` })
    )
  );
  form.append('uploaderName', uploaderName || gallery.uploaderName || 'Manchester Gents member');
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
  const download = (url) => {
    const ext = (url.split('?')[0].match(/\.(jpe?g|png|webp|heic|gif)$/i)?.[1] || 'jpg').toLowerCase();
    return File.downloadFileAsync(url, new File(dir, `${photo.id}.${ext}`), { idempotent: true });
  };
  const file = await download(photo.original).catch((error) => {
    if (!photo.backupOriginal) throw error;
    return download(photo.backupOriginal);
  });
  await MediaLibrary.saveToLibraryAsync(file.uri);
}

// The photos the full-screen viewer (app/photos.js) pages through, set by the
// screen that opens it.
let viewerSession = { photos: [], index: 0 };
export function openViewerSession(photos, index) {
  viewerSession = { photos, index };
}
export function getViewerSession() {
  return viewerSession;
}
