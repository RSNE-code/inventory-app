/**
 * ActionItems — "Needs Attention" card with severity-colored rows.
 * Matches web's action-items.tsx exactly.
 */
import { useCallback } from "react";
import { StyleSheet, View, Text, Pressable } from "react-native";
import {
  AlertTriangle,
  XCircle,
  ClipboardList,
  Factory,
  CheckCircle,
  ChevronRight,
} from "lucide-react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useRouter } from "expo-router";
import { Card } from "@/components/ui/Card";
import { colors } from "@/constants/colors";
import { type as typography } from "@/constants/typography";
import { spacing, radius } from "@/constants/layout";
import { STAGGER_DELAY } from "@/constants/animations";

interface ActionItemsProps {
  bomStatusCounts: Record<string, number>;
  lowStockCount: number;
  outOfStockCount: number;
  pendingApprovals: number;
  unfabricatedAssemblyCount: number;
}

interface ActionRow {
  label: string;
  severity: "critical" | "warning" | "info";
  Icon: typeof AlertTriangle;
  route?: string;
}

const SEVERITY_COLORS = {
  critical: { dot: colors.statusRed, text: colors.statusRed },
  warning: { dot: colors.statusYellow, text: colors.statusYellow },
  info: { dot: colors.brandBlue, text: colors.brandBlue },
};

export function ActionItems({
  bomStatusCounts,
  lowStockCount,
  outOfStockCount,
  pendingApprovals,
  unfabricatedAssemblyCount,
}: ActionItemsProps) {
  const router = useRouter();

  const handleRowPress = useCallback(
    (route?: string) => {
      if (route) {
        router.push(route as any);
      }
    },
    [router],
  );

  const rows: ActionRow[] = [];

  if (outOfStockCount > 0) {
    rows.push({
      label: `${outOfStockCount} item${outOfStockCount !== 1 ? "s" : ""} out of stock`,
      severity: "critical",
      Icon: XCircle,
      route: "/inventory",
    });
  }
  if (lowStockCount > 0) {
    rows.push({
      label: `${lowStockCount} item${lowStockCount !== 1 ? "s" : ""} need reorder`,
      severity: "warning",
      Icon: AlertTriangle,
      route: "/reorder",
    });
  }
  if (unfabricatedAssemblyCount > 0) {
    rows.push({
      label: `${unfabricatedAssemblyCount} assembly item${unfabricatedAssemblyCount !== 1 ? "s" : ""} missing fab order`,
      severity: "warning",
      Icon: Factory,
    });
  }
  const pendingReview = bomStatusCounts.PENDING_REVIEW || 0;
  if (pendingReview > 0) {
    rows.push({
      label: `${pendingReview} BOM${pendingReview !== 1 ? "s" : ""} pending review`,
      severity: "info",
      Icon: ClipboardList,
    });
  }
  if (pendingApprovals > 0) {
    rows.push({
      label: `${pendingApprovals} door${pendingApprovals !== 1 ? "s" : ""} awaiting approval`,
      severity: "info",
      Icon: Factory,
    });
  }

  // All clear
  if (rows.length === 0) {
    return (
      <Card accent="green">
        <View style={styles.allClearRow}>
          <View style={styles.allClearIcon}>
            <CheckCircle size={22} color={colors.statusGreen} strokeWidth={2} />
          </View>
          <View>
            <Text style={styles.allClearTitle}>All Clear</Text>
            <Text style={styles.allClearSub}>Nothing needs your attention right now</Text>
          </View>
        </View>
      </Card>
    );
  }

  return (
    <Card accent="orange" style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Needs Attention</Text>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{rows.length}</Text>
        </View>
      </View>

      {rows.map((row, i) => {
        const sev = SEVERITY_COLORS[row.severity];
        return (
          <Animated.View
            key={row.label}
            entering={FadeInDown.delay(i * STAGGER_DELAY).springify().damping(15)}
          >
            <Pressable
              onPress={() => handleRowPress(row.route)}
              disabled={!row.route}
              style={[
                styles.row,
                i < rows.length - 1 && styles.rowBorder,
              ]}
            >
              <View style={[styles.dot, { backgroundColor: sev.dot }]} />
              <row.Icon size={16} color={sev.text} strokeWidth={2} />
              <Text style={styles.rowLabel}>{row.label}</Text>
              {row.route ? (
                <ChevronRight size={16} color={colors.textMuted} strokeWidth={1.5} />
              ) : null}
            </Pressable>
          </Animated.View>
        );
      })}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: 0,
    backgroundColor: "rgba(232, 121, 43, 0.04)",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  title: {
    ...typography.cardTitle,
    color: colors.navy,
  },
  countBadge: {
    backgroundColor: "rgba(232, 121, 43, 0.15)",
    borderRadius: radius.full,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  countText: {
    ...typography.caption,
    fontWeight: "700",
    color: colors.brandOrange,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 48,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(226, 230, 235, 0.4)",
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  rowLabel: {
    ...typography.subtitle,
    fontWeight: "600",
    color: colors.navy,
    flex: 1,
  },
  allClearRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  allClearIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.xl,
    backgroundColor: colors.statusGreenBg,
    alignItems: "center",
    justifyContent: "center",
  },
  allClearTitle: {
    ...typography.cardTitle,
    color: colors.navy,
  },
  allClearSub: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
});
