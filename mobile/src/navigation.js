import { Platform } from 'react-native';
import { colors, fonts } from './theme';

// Shared native-stack header look. On iOS the header is transparent so the
// system draws Liquid Glass behind it as content scrolls.
export const stackScreenOptions = {
  headerTintColor: colors.gold,
  headerTitleStyle: { color: colors.text },
  headerLargeTitleStyle: { color: colors.gold, fontFamily: fonts.heading },
  headerStyle: Platform.OS === 'android' ? { backgroundColor: colors.navy } : undefined,
  headerTransparent: Platform.OS === 'ios',
  headerShadowVisible: false,
  headerBackButtonDisplayMode: 'minimal',
  contentStyle: { backgroundColor: colors.navy }
};

export const sheetOptions = {
  presentation: 'formSheet',
  sheetGrabberVisible: true,
  headerTransparent: false,
  headerStyle: { backgroundColor: colors.navy }
};
