/**
 * InventoryForecastChart — transaction history forecast (Tier 1).
 */
import { StyleSheet, View, Text } from "react-native";
import { TrendingDown } from "lucide-react-native";
import { Card } from "@/components/ui/Card";
import { colors } from "@/constants/colors";
import { type as typography } from "@/constants/typography";
import { spacing, radius } from "@/constants/layout";

interface InventoryForecastChartProps {
  productName: string;
  currentQty: number;
  avgDailyUsage: number;
  daysUntilStockout: number | null;
}

export function InventoryForecastChart({ productName, currentQty, avgDailyUsage, daysUntilStockout }: InventoryForecastChartProps) {
  return (
    <Card>
      <View style={styles.header}>
        <TrendingDown size={18} color={colors.brandBlue} strokeWidth={2} />
        <Text style={styles.title}>Usage Forecast</Text>
      </View>
      <View style={styles.stats}>
        <View style={styles.stat}>
          <Text style={styles.statValue}>{avgDailyUsage.toFixed(1)}</Text>
          <Text style={styles.statLabel}>Avg daily usage</Text>
        </View>
        <View style={styles.stat}>
          <Text style={[styles.statValue, daysUntilStockout !== null && daysUntilStockout < 14 && styles.statWarning]}>
            {daysUntilStockout !== null ? `${daysUntilStockout}d` : "N/A"}
          </Text>
          <Text style={styles.statLabel}>Until stockout</Text>
        </View>
      </View>
      <View style={styles.bar}>
        <View style={[styles.barFill, { width: `${Math.min(100, (daysUntilStockout ?? 0) / 30 * 100)}%` }]} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.md },
  title: { ...typography.cardTitle, color: colors.navy },
  stats: { flexDirection: "row", gap: spacing["2xl"], marginBottom: spacing.md },
  stat: { alignItems: "center" },
  statValue: { ...typography.sectionTitle, color: colors.navy, fontVariant: ["tabular-nums"] },
  statWarning: { color: colors.statusRed },
  statLabel: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  bar: { height: 6, backgroundColor: colors.surfaceSecondary, borderRadius: 3, overflow: "hidden" },
  barFill: { height: "100%", backgroundColor: colors.brandBlue, borderRadius: 3 },
});
