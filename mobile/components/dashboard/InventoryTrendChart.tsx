/**
 * InventoryTrendChart — visual summary of recent inventory activity.
 * Uses recent transactions to show a simple activity bar chart.
 */
import { useMemo } from "react";
import { StyleSheet, View, Text } from "react-native";
import { TrendingUp } from "lucide-react-native";
import { Card } from "@/components/ui/Card";
import { colors } from "@/constants/colors";
import { type as typography } from "@/constants/typography";
import { spacing, radius } from "@/constants/layout";
import type { RecentTransaction } from "@/types/api";

interface InventoryTrendChartProps {
  transactions?: RecentTransaction[];
}

/** Group transactions by day, show last 7 days as bars */
export function InventoryTrendChart({ transactions = [] }: InventoryTrendChartProps) {
  const dailyData = useMemo(() => {
    const days: { label: string; count: number }[] = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString(undefined, { weekday: "short" });
      const count = transactions.filter(
        (t) => t.createdAt.slice(0, 10) === key
      ).length;
      days.push({ label, count });
    }
    return days;
  }, [transactions]);

  const maxCount = Math.max(1, ...dailyData.map((d) => d.count));

  return (
    <Card>
      <View style={styles.header}>
        <View style={styles.iconBox}>
          <TrendingUp size={16} color={colors.brandBlue} strokeWidth={2} />
        </View>
        <Text style={styles.title}>Recent Activity</Text>
        <Text style={styles.subtitle}>Last 7 days</Text>
      </View>
      <View style={styles.chartArea}>
        {dailyData.map((day) => (
          <View key={day.label} style={styles.barCol}>
            <View style={styles.barTrack}>
              <View
                style={[
                  styles.barFill,
                  {
                    height: `${Math.max(4, (day.count / maxCount) * 100)}%`,
                    backgroundColor: day.count > 0 ? colors.brandBlue : colors.border,
                  },
                ]}
              />
            </View>
            <Text style={styles.barCount}>{day.count}</Text>
            <Text style={styles.barLabel}>{day.label}</Text>
          </View>
        ))}
      </View>
      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Total transactions</Text>
        <Text style={styles.totalValue}>{transactions.length}</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: radius.xl,
    backgroundColor: colors.statusBlueBg,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    ...typography.cardTitle,
    color: colors.navy,
    flex: 1,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textMuted,
  },
  chartArea: {
    flexDirection: "row",
    alignItems: "flex-end",
    height: 100,
    gap: spacing.sm,
  },
  barCol: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  barTrack: {
    width: "100%",
    height: 80,
    justifyContent: "flex-end",
    alignItems: "center",
  },
  barFill: {
    width: "60%",
    borderRadius: radius.sm,
    minHeight: 4,
  },
  barCount: {
    ...typography.caption,
    fontWeight: "700",
    color: colors.navy,
    fontVariant: ["tabular-nums"],
    fontSize: 10,
  },
  barLabel: {
    ...typography.caption,
    color: colors.textMuted,
    fontSize: 10,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  totalLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },
  totalValue: {
    ...typography.subtitle,
    fontWeight: "700",
    color: colors.navy,
    fontVariant: ["tabular-nums"],
  },
});
