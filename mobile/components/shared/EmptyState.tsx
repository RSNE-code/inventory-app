/**
 * EmptyState — icon + title + description + optional CTA button.
 * Matches web's icon box (72px, bg-brand-blue/10, rounded-2xl) + decorative dashed ring.
 */
import { StyleSheet, View, Text } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";
import { colors } from "@/constants/colors";
import { type as typography } from "@/constants/typography";
import { spacing, radius } from "@/constants/layout";
import { Button } from "@/components/ui/Button";

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  return (
    <Animated.View entering={FadeIn.duration(300)} style={styles.container}>
      {/* Icon box with decorative ring */}
      <View style={styles.iconOuter}>
        <View style={styles.decorativeRing} />
        <View style={styles.iconBox}>{icon}</View>
      </View>
      <Text style={styles.title}>{title}</Text>
      {description && <Text style={styles.description}>{description}</Text>}
      {actionLabel && onAction && (
        <Button title={actionLabel} onPress={onAction} size="md" style={styles.button} />
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 64, // py-16 = 64px
    paddingHorizontal: spacing.lg,
  },
  iconOuter: {
    width: 88, // 72 + 8*2 offset
    height: 88,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.lg,
  },
  decorativeRing: {
    position: "absolute",
    width: 88,
    height: 88,
    borderRadius: radius["2xl"],
    borderWidth: 2,
    borderColor: "rgba(46, 125, 186, 0.2)",
    borderStyle: "dashed",
  },
  iconBox: {
    width: 72, // h-18 w-18 = 72px
    height: 72,
    borderRadius: radius["2xl"], // rounded-2xl = 18px
    backgroundColor: "rgba(46, 125, 186, 0.1)", // bg-brand-blue/10
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    ...typography.sectionTitle,
    fontSize: 20, // text-xl
    fontWeight: "700",
    color: colors.navy,
    textAlign: "center",
    letterSpacing: -0.3, // tracking-tight
  },
  description: {
    ...typography.body,
    fontSize: 14, // text-sm
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: spacing.sm,
    maxWidth: 260,
    lineHeight: 22, // leading-relaxed
  },
  button: {
    marginTop: spacing.xl,
  },
});
