import { useEffect } from 'react';
import { Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import Animated, {
  FadeInDown,
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming
} from 'react-native-reanimated';

// Content that slides up into place, staggered by `index`. Respects the
// system "Reduce Motion" setting.
export function Rise({ index = 0, style, children }) {
  return (
    <Animated.View
      style={style}
      entering={FadeInDown.delay(80 + index * 70)
        .springify()
        .damping(18)
        .reduceMotion(ReduceMotion.System)}
    >
      {children}
    </Animated.View>
  );
}

// A pressable that eases down slightly while held, with a light tap.
export function PressableScale({ onPress, style, children, haptic = true, ...props }) {
  const scale = useSharedValue(1);
  const animated = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Pressable
      {...props}
      onPress={(e) => {
        if (haptic) Haptics.selectionAsync().catch(() => {});
        onPress?.(e);
      }}
      onPressIn={() => {
        scale.value = withSpring(0.97, { damping: 20, stiffness: 400 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 14, stiffness: 300 });
      }}
    >
      <Animated.View style={[style, animated]}>{children}</Animated.View>
    </Pressable>
  );
}

// A softly pulsing placeholder while content loads.
export function Placeholder({ style }) {
  const opacity = useSharedValue(0.45);
  useEffect(() => {
    opacity.value = withRepeat(withSequence(withTiming(0.85, { duration: 700 }), withTiming(0.45, { duration: 700 })), -1);
  }, [opacity]);
  const animated = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return <Animated.View style={[{ backgroundColor: 'rgba(255, 255, 255, 0.08)', borderRadius: 16 }, style, animated]} />;
}
