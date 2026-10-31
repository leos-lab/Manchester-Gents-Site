import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// iPhone Duo: folded, iOS puts the status bar, back button and tab bar in a
// vertical rail on one side and reserves it with an 84pt left or right safe
// area inset (the side can change, e.g. in Split View). Native headers and
// tabs avoid it themselves; our own padding, lists and floating controls add
// these insets so nothing sits under the rail. Elsewhere they're 0 in portrait.

// Horizontal padding of `base` plus the side insets.
export function useGutter(base = 0) {
  const { left, right } = useSafeAreaInsets();
  return { paddingLeft: base + left, paddingRight: base + right };
}

// Padding for a sheet's scrolling content: the side gutter plus room at the
// bottom for the home indicator, so the last button is never against the edge.
export function useSheetPadding(base = 0) {
  const { left, right, bottom } = useSafeAreaInsets();
  return { paddingLeft: base + left, paddingRight: base + right, paddingBottom: Math.max(bottom, 16) + 32 };
}

// Adds the side insets to whatever horizontal padding a style already has.
export function withSideInsets(style, { left, right }) {
  const flat = StyleSheet.flatten(style) || {};
  const pick = (side) => flat[side] ?? flat.paddingHorizontal ?? flat.padding ?? 0;
  return [flat, { paddingLeft: pick('paddingLeft') + left, paddingRight: pick('paddingRight') + right }];
}
