/**
 * Card — base container with optional left accent bar.
 * Matches web's rounded-xl, shadow-brand, border-border-custom pattern.
 */
import { StyleSheet, View, Pressable, type ViewStyle } from "react-native";
import { colors } from "@/constants/colors";
import { spacing, radius, ACCENT_BAR_WIDTH } from "@/constants/layout";
import { shadowBrand } from "@/constants/shadows";

type AccentColor = "blue" | "orange" | "green" | "yellow" | "red" | "gray";

const ACCENT_COLORS: Record<AccentColor, string> = {
  blue: colors.brandBlue,
  orange: colors.brandOrange,
  green: colors.statusGreen,
  yellow: colors.statusYellow,
  red: colors.statusRed,
  gray: colors.border,
};

interface CardProps {
  children: React.ReactNode;
  accent?: AccentColor;
  onPress?: () => void;
  style?: ViewStyle;
}

export function Card({ children, accent, onPress, style }: CardProps) {
  const content = (
    <View
      style={[
        styles.card,
        accent && {
          borderLeftWidth: ACCENT_BAR_WIDTH,
          borderLeftColor: ACCENT_COLORS[accent],
        },
        style,
      ]}
    >
      {children}
    </View>
  );

  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        style={({ pressed }) => pressed && styles.pressed}
      >
        {content}
      </Pressable>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    ...shadowBrand,
  },
  pressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.95,
  },
});
