/**
 * StockSummaryCard — total inventory value, product count, low/out indicators.
 * Matches web's stock-summary-card.tsx.
 */
import { StyleSheet, View, Text } from "react-native";
import { DollarSign } from "lucide-react-native";
import { Card } from "@/components/ui/Card";
import { colors } from "@/constants/colors";
import { type as typography } from "@/constants/typography";
import { spacing, radius } from "@/constants/layout";
import { formatCurrency } from "@/lib/utils";

interface StockSummaryProps {
  summary: {
    totalProducts: number;
    totalValue: number;
    lowStockCount: number;
    outOfStockCount: number;
  };
}

export function StockSummaryCard({ summary }: StockSummaryProps) {
  return (
    <Card accent="blue">
      <View style={styles.row}>
        <View style={styles.textCol}>
          <Text style={styles.label}>INVENTORY VALUE</Text>
          <Text style={styles.value}>{formatCurrency(summary.totalValue)}</Text>
        </View>
        <View style={styles.iconBox}>
          <DollarSign size={24} color={colors.brandBlue} strokeWidth={2} />
        </View>
      </View>
      <Text style={styles.meta}>
        {summary.totalProducts} products
        {summary.lowStockCount > 0 && (
          <Text style={styles.metaYellow}> · {summary.lowStockCount} low stock</Text>
        )}
        {summary.outOfStockCount > 0 && (
          <Text style={styles.metaRed}> · {summary.outOfStockCount} out</Text>
        )}
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  textCol: {
    flex: 1,
  },
  label: {
    ...typography.label,
    color: colors.textMuted,
  },
  value: {
    ...typography.displayLarge,
    color: colors.navy,
    marginTop: 4,
    fontVariant: ["tabular-nums"],
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: radius.xl,
    backgroundColor: "rgba(46, 125, 186, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  meta: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: "500",
    marginTop: spacing.md,
  },
  metaYellow: {
    color: colors.statusYellow,
  },
  metaRed: {
    color: colors.statusRed,
  },
});
