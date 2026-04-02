/**
 * Button — primary (orange), secondary (outline), ghost, destructive variants.
 * Pressable with haptic feedback, minimum touch target 44px.
 */
import { StyleSheet, Pressable, Text, ActivityIndicator, type ViewStyle } from "react-native";
import * as Haptics from "expo-haptics";
import { colors } from "@/constants/colors";
import { type as typography } from "@/constants/typography";
import { spacing, radius } from "@/constants/layout";

type Variant = "primary" | "secondary" | "ghost" | "destructive";
type Size = "sm" | "md" | "lg";

interface ButtonProps {
  title: string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  onPress: () => void;
  style?: ViewStyle;
  icon?: React.ReactNode;
}

const HEIGHT: Record<Size, number> = { sm: 36, md: 44, lg: 52 };

export function Button({
  title,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  onPress,
  style,
  icon,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  const handlePress = () => {
    if (isDisabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: isDisabled }}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        { height: HEIGHT[size] },
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === "primary" ? colors.textInverse : colors.brandOrange}
        />
      ) : (
        <>
          {icon}
          <Text
            style={[
              styles.label,
              styles[`${variant}Label` as keyof typeof styles] as object,
              size === "sm" && styles.labelSm,
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.xl,
  },
  pressed: {
    transform: [{ scale: 0.97 }],
    opacity: 0.9,
  },
  disabled: {
    opacity: 0.5,
  },

  // Variants
  primary: {
    backgroundColor: colors.brandOrange,
  },
  secondary: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  ghost: {
    backgroundColor: "transparent",
  },
  destructive: {
    backgroundColor: colors.statusRed,
  },

  // Labels
  label: {
    ...typography.bodyMedium,
    fontWeight: "600",
  },
  primaryLabel: {
    color: colors.textInverse,
  },
  secondaryLabel: {
    color: colors.textPrimary,
  },
  ghostLabel: {
    color: colors.brandBlue,
  },
  destructiveLabel: {
    color: colors.textInverse,
  },
  labelSm: {
    fontSize: 13,
  },
});
