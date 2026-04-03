/**
 * BomModeBar — colored banner showing active BOM editing mode.
 */
import { StyleSheet, View, Text, Pressable } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Pencil, Plus, Undo2, X } from "lucide-react-native";
import { useIsTablet } from "@/lib/hooks/useDeviceType";
import { colors } from "@/constants/colors";
import { type as typography } from "@/constants/typography";
import { spacing, radius } from "@/constants/layout";

type BomMode = "view" | "edit" | "add-material" | "return";

interface BomModeBarProps {
  mode: BomMode;
  onExit: () => void;
}

const MODE_CONFIG: Record<Exclude<BomMode, "view">, { label: string; color: string; icon: typeof Pencil }> = {
  edit: { label: "Edit Mode", color: colors.brandBlue, icon: Pencil },
  "add-material": { label: "Add Material", color: colors.brandOrange, icon: Plus },
  return: { label: "Return Material", color: colors.statusGreen, icon: Undo2 },
};

export function BomModeBar({ mode, onExit }: BomModeBarProps) {
  if (mode === "view") return null;

  const config = MODE_CONFIG[mode];
  const isTablet = useIsTablet();
  const exitSize = isTablet ? 48 : 44;
  const Icon = config.icon;

  return (
    <Animated.View
      entering={FadeInDown.springify().damping(20)}
      style={[styles.bar, { backgroundColor: config.color }]}
    >
      <Icon size={18} color={colors.textInverse} strokeWidth={2} />
      <Text style={styles.label}>{config.label}</Text>
      <Pressable
        onPress={onExit}
        style={[styles.exitBtn, { minWidth: exitSize, minHeight: exitSize }]}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      >
        <X size={18} color={colors.textInverse} strokeWidth={2} />
        <Text style={styles.exitText}>Exit</Text>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.lg,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.subtitle,
    fontWeight: "600",
    color: colors.textInverse,
    flex: 1,
  },
  exitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    borderRadius: radius.md,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: spacing.md,
  },
  exitText: {
    ...typography.caption,
    fontWeight: "600",
    color: colors.textInverse,
  },
});
