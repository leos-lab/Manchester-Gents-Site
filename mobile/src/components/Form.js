import { Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { colors, radius, space } from '../theme';

// Labelled text field used by the join, profile and admin forms.
export function Field({ label, hint, error, style, inputStyle, ...input }) {
  return (
    <View style={[styles.field, style]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        style={[styles.input, input.multiline && styles.multiline, error && styles.inputError, inputStyle]}
        placeholderTextColor={colors.textFaint}
        accessibilityLabel={label}
        {...input}
      />
      {error ? <Text style={styles.error}>{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

// A switch with a title and optional explanation; the whole row is tappable.
export function ToggleRow({ title, description, value, onValueChange, disabled }) {
  return (
    <Pressable
      style={styles.toggle}
      onPress={() => !disabled && onValueChange(!value)}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      accessibilityLabel={title}
      accessibilityHint={description}
    >
      <View style={styles.toggleText}>
        <Text style={styles.toggleTitle}>{title}</Text>
        {description ? <Text style={styles.toggleDescription}>{description}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ true: colors.gold, false: colors.card }}
        thumbColor={colors.text}
        importantForAccessibility="no"
      />
    </Pressable>
  );
}

export function SectionTitle({ children }) {
  return <Text style={styles.section}>{children}</Text>;
}

const styles = StyleSheet.create({
  field: { gap: 6 },
  label: { color: colors.textMuted, fontSize: 14, fontWeight: '600' },
  input: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    color: colors.text,
    fontSize: 16,
    paddingHorizontal: space.lg,
    paddingVertical: 13
  },
  multiline: { minHeight: 96, textAlignVertical: 'top', paddingTop: 13 },
  inputError: { borderColor: colors.danger },
  error: { color: colors.danger, fontSize: 13 },
  hint: { color: colors.textFaint, fontSize: 13 },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: space.lg
  },
  toggleText: { flex: 1, gap: 4 },
  toggleTitle: { color: colors.text, fontSize: 16, fontWeight: '600' },
  toggleDescription: { color: colors.textMuted, fontSize: 14, lineHeight: 20 },
  section: { color: colors.gold, fontSize: 15, fontWeight: '700', marginTop: space.md }
});
