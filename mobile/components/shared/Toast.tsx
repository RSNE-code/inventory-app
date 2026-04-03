/**
 * Toast — auto-dismiss notification banner.
 *
 * Variants: success, error, info.
 * Positioned below the safe-area top inset, centered, max 400pt on iPad.
 * Animated with Reanimated FadeInDown / FadeOutUp.
 */
import { StyleSheet, Text, View } from "react-native";
import Animated, { FadeInDown, FadeOutUp } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Check, AlertTriangle, Info } from "lucide-react-native";
import { colors } from "@/constants/colors";
import { type as typography } from "@/constants/typography";
import { spacing, radius } from "@/constants/layout";

export type ToastVariant = "success" | "error" | "info";

interface ToastProps {
  message: string;
  variant: ToastVariant;
}

const VARIANT_CONFIG: Record<
  ToastVariant,
  { bg: string; icon: React.ElementType }
> = {
  success: { bg: colors.statusGreen, icon: Check },
  error: { bg: colors.statusRed, icon: AlertTriangle },
  info: { bg: colors.brandBlue, icon: Info },
};

export function Toast({ message, variant }: ToastProps) {
  const insets = useSafeAreaInsets();
  const { bg, icon: Icon } = VARIANT_CONFIG[variant];

  return (
    <Animated.View
      entering={FadeInDown.duration(300)}
      exiting={FadeOutUp.duration(200)}
      style={[styles.wrapper, { top: insets.top + spacing.sm }]}
      pointerEvents="none"
    >
      <View style={[styles.container, { backgroundColor: bg }]}>
        <Icon size={20} color={colors.textInverse} strokeWidth={2.5} />
        <Text style={styles.text} numberOfLines={2}>
          {message}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: 9999,
    alignItems: "center",
    paddingHorizontal: spacing.lg,
  },
  container: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: spacing["5xl"],
    maxWidth: 400,
    width: "100%",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.xl,
    gap: spacing.md,
  },
  text: {
    ...typography.bodyMedium,
    color: colors.textInverse,
    flexShrink: 1,
  },
});
