import { StyleSheet, View } from 'react-native';
import { MAX_CONTENT_WIDTH } from '../theme';

// Centres content with a max width so it reads well on wide windows
// (iPhone Duo unfolded, iPad, resized iOS 27 windows).
export function Content({ style, children }) {
  return <View style={[styles.content, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center' }
});
