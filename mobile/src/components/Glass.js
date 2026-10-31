import { Platform, StyleSheet, View } from 'react-native';
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect';
import { colors } from '../theme';

const LIQUID_GLASS = Platform.OS === 'ios' && isLiquidGlassAvailable();

// Liquid Glass on iOS 26+/27 builds; a translucent panel elsewhere.
export function Glass({ style, children, interactive = false, tint }) {
  if (LIQUID_GLASS) {
    return (
      <GlassView style={style} glassEffectStyle="regular" isInteractive={interactive} tintColor={tint}>
        {children}
      </GlassView>
    );
  }
  return <View style={[styles.fallback, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  fallback: {
    backgroundColor: 'rgba(28, 40, 55, 0.92)',
    borderColor: colors.border,
    borderWidth: StyleSheet.hairlineWidth
  }
});
