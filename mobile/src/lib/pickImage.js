import { ActionSheetIOS, Alert, Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

// Asks "camera or library?", then returns the picked image asset (or null).
export async function pickImage({ title, message, aspect = [1, 1] } = {}) {
  const source = await new Promise((resolve) => {
    const labels = ['Choose from library', 'Take photo', 'Cancel'];
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        { options: labels, cancelButtonIndex: 2, title, message, userInterfaceStyle: 'dark' },
        (i) => resolve(['library', 'camera', null][i])
      );
    } else {
      Alert.alert(title || 'Photo', message, [
        { text: labels[0], onPress: () => resolve('library') },
        { text: labels[1], onPress: () => resolve('camera') },
        { text: 'Cancel', style: 'cancel', onPress: () => resolve(null) }
      ]);
    }
  });
  if (!source) return null;
  const options = { mediaTypes: ['images'], allowsEditing: true, aspect, quality: 0.85 };
  if (source === 'camera') {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) return null;
  }
  const result =
    source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
  if (result.canceled || !result.assets?.[0]) return null;
  const asset = result.assets[0];
  return { uri: asset.uri, mimeType: asset.mimeType || 'image/jpeg', fileName: asset.fileName || 'photo.jpg' };
}
