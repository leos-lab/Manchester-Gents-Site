import { useState } from 'react';
import { Image } from 'expo-image';

// An image that switches to a backup URL if the first one fails to load
// (gallery photos come from Pinstripe, with the ImgBB copy as backup).
export function BackupImage({ uri, backupUri, ...props }) {
  const [failed, setFailed] = useState(false);
  const source = failed && backupUri ? backupUri : uri;
  return <Image {...props} source={{ uri: source }} onError={() => backupUri && setFailed(true)} />;
}
