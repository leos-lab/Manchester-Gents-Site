import { useId, useMemo } from 'react';
import { InputAccessoryView, Keyboard, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, space } from '../theme';

// A "Done" bar above the iPhone keyboard to put it away. Each text field gets
// its own bar (that also works inside sheets): spread `inputProps` onto the
// TextInput and render `bar` next to it. Android has its own close key.
//
// The bar is built once per field: re-rendering it on every keystroke makes
// iOS reload the keyboard, which flickers the bar, jumps the screen and flips
// the keyboard back from numbers to letters after each character.
export function useKeyboardDone() {
  const id = `keyboard-done-${useId()}`;
  return useMemo(() => {
    if (Platform.OS !== 'ios') return { inputProps: {}, bar: null };
    return {
      inputProps: { inputAccessoryViewID: id },
      bar: (
        <InputAccessoryView nativeID={id}>
          <View style={styles.bar}>
            <Pressable onPress={Keyboard.dismiss} hitSlop={10} accessibilityRole="button" accessibilityLabel="Hide keyboard">
              <Text style={styles.done}>Done</Text>
            </Pressable>
          </View>
        </InputAccessoryView>
      )
    };
  }, [id]);
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: space.lg,
    paddingVertical: 10,
    backgroundColor: colors.slate,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255, 255, 255, 0.12)'
  },
  done: { color: colors.gold, fontSize: 17, fontWeight: '600' }
});
