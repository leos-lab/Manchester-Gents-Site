import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { withSideInsets } from '../lib/layout';
import { MAX_CONTENT_WIDTH } from '../theme';

// Centres content with a max width so it reads well on wide windows
// (iPhone Duo unfolded, iPad, resized iOS 27 windows), and keeps it clear of
// the Duo's folded-state rail (see lib/layout.js).
export function Content({ style, children }) {
  const insets = useSafeAreaInsets();
  return <View style={[styles.content, withSideInsets(style, insets)]}>{children}</View>;
}

const styles = StyleSheet.create({
  content: { width: '100%', maxWidth: MAX_CONTENT_WIDTH, alignSelf: 'center' }
});
