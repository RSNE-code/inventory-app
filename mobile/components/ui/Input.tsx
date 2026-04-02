/**
 * Input — text input with label, surface-secondary bg, focus blue border.
 * Minimum height 44px for touch target compliance.
 */
import { useState } from "react";
import { StyleSheet, View, Text, TextInput, type TextInputProps, type ViewStyle } from "react-native";
import { colors } from "@/constants/colors";
import { type as typography } from "@/constants/typography";
import { spacing, radius } from "@/constants/layout";

interface InputProps extends Omit<TextInputProps, "style"> {
  label?: string;
  error?: string;
  style?: ViewStyle;
}

export function Input({ label, error, style, ...props }: InputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={[styles.container, style]}>
      {label && <Text style={styles.label}>{label}</Text>}
      <TextInput
        {...props}
        style={[
          styles.input,
          focused && styles.inputFocused,
          error && styles.inputError,
        ]}
        placeholderTextColor={colors.textMuted}
        onFocus={(e) => {
          setFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          props.onBlur?.(e);
        }}
      />
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xs,
  },
  label: {
    ...typography.caption,
    fontWeight: "500",
    color: colors.textSecondary,
  },
  input: {
    ...typography.body,
    height: 48,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: "transparent",
    paddingHorizontal: spacing.lg,
    color: colors.textPrimary,
  },
  inputFocused: {
    backgroundColor: colors.background,
    borderColor: colors.brandBlue,
  },
  inputError: {
    borderColor: colors.statusRed,
  },
  error: {
    ...typography.caption,
    color: colors.statusRed,
  },
});
