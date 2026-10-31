import { File } from 'expo-file-system';

// A file for FormData uploads. Expo's fetch (the app's global fetch since
// SDK 58) reads parts through bytes(); React Native's { uri } parts aren't
// supported and the upload never leaves the phone. Name and type are set
// explicitly because servers check the image type: taken from the file
// itself, since the picker can report HEIC for a photo it saved as JPEG.
const TYPES = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', heic: 'image/heic', heif: 'image/heif' };

export function filePart({ uri, mimeType = 'image/jpeg', fileName = 'photo.jpg' }) {
  const file = new File(uri);
  const ext = uri.split('?')[0].split('.').pop()?.toLowerCase();
  const type = TYPES[ext] || mimeType;
  const name = TYPES[ext] ? fileName.replace(/\.[a-z0-9]+$/i, '') + '.' + ext : fileName;
  return { name, type, bytes: () => file.bytes() };
}

// Picker options so iPhone photos (often HEIC) arrive as JPEG, which every
// upload accepts.
export const COMPATIBLE_PHOTOS = { preferredAssetRepresentationMode: 'compatible' };
