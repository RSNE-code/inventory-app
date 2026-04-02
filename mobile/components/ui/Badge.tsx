/**
 * Badge — status pill with colored dot and 15% opacity background.
 * Matches web's px-2.5 py-1 rounded-full text-xs font-semibold pattern.
 */
import { StyleSheet, View, Text } from "react-native";
import { colors } from "@/constants/colors";
import { type as typography } from "@/constants/typography";
import { spacing, radius } from "@/constants/layout";

type BadgeVariant = "green" | "yellow" | "red" | "blue" | "orange" | "gray";

interface BadgeProps {
  label: string;
  variant: BadgeVariant;
  showDot?: boolean;
}

const BADGE_CONFIG: Record<BadgeVariant, { bg: string; text: string; dot: string }> = {
  green: { bg: colors.statusGreenBg, text: colors.statusGreen, dot: colors.statusGreen },
  yellow: { bg: colors.statusYellowBg, text: "#A16207", dot: colors.statusYellow },
  red: { bg: colors.statusRedBg, text: colors.statusRed, dot: colors.statusRed },
  blue: { bg: colors.statusBlueBg, text: colors.brandBlue, dot: colors.brandBlue },
  orange: {
    bg: "rgba(232, 121, 43, 0.15)",
    text: colors.brandOrange,
    dot: colors.brandOrange,
  },
  gray: { bg: colors.statusGrayBg, text: colors.statusGray, dot: colors.statusGray },
};

export function Badge({ label, variant, showDot = true }: BadgeProps) {
  const config = BADGE_CONFIG[variant];

  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      {showDot && <View style={[styles.dot, { backgroundColor: config.dot }]} />}
      <Text style={[styles.label, { color: config.text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  label: {
    fontFamily: typography.caption.fontFamily,
    fontWeight: "600",
    fontSize: 12,
    lineHeight: 16,
  },
});
