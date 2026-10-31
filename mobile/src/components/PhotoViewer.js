import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from './Icon';
import { colors, space } from '../theme';

// Full-screen view of one photo. `source` is an expo-image source (can carry
// the app token for private photos). Tap anywhere to close.
export function PhotoViewer({ source, label, onClose }) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={Boolean(source)} animationType="fade" onRequestClose={onClose} supportedOrientations={['portrait', 'landscape']} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityRole="button" accessibilityLabel="Close photo">
        {source ? <Image source={source} style={StyleSheet.absoluteFill} contentFit="contain" transition={150} accessibilityLabel={label} /> : null}
        <View style={[styles.close, { top: insets.top + space.sm, right: insets.right + space.lg }]}>
          <Icon name="xmark.circle.fill" size={30} color={colors.text} />
          {label ? <Text style={styles.label}>{label}</Text> : null}
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#000' },
  close: { position: 'absolute', flexDirection: 'row-reverse', alignItems: 'center', gap: space.sm },
  label: { color: colors.text, fontSize: 15, fontWeight: '600' }
});
