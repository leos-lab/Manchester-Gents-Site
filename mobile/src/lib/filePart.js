import { File } from 'expo-file-system';

// A file for FormData uploads. Expo's fetch (the app's global fetch since
// SDK 58) reads parts through bytes(); React Native's { uri } parts aren't
// supported and the upload never leaves the phone. Name and type are set
// explicitly because servers check the image type.
export function filePart({ uri, mimeType = 'image/jpeg', fileName = 'photo.jpg' }) {
  const file = new File(uri);
  return { name: fileName, type: mimeType, bytes: () => file.bytes() };
}
