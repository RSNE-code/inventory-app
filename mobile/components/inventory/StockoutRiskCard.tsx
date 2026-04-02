/**
 * StockoutRiskCard — stockout risk assessment for Tier 1 items.
 */
import { StyleSheet, View, Text } from "react-native";
import { AlertTriangle, TrendingDown } from "lucide-react-native";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { colors } from "@/constants/colors";
import { type as typography } from "@/constants/typography";
import { spacing, radius } from "@/constants/layout";

interface StockoutRiskCardProps {
  daysUntilStockout: number | null;
  currentQty: number;
  reorderPoint: number;
  avgDailyUsage: number;
}

export function StockoutRiskCard({ daysUntilStockout, currentQty, reorderPoint, avgDailyUsage }: StockoutRiskCardProps) {
  if (daysUntilStockout === null || avgDailyUsage <= 0) return null;

  const isHigh = daysUntilStockout < 7;
  const isMedium = daysUntilStockout < 14;

  return (
    <Card accent={isHigh ? "red" : isMedium ? "yellow" : "green"}>
      <View style={styles.header}>
        {isHigh ? <AlertTriangle size={18} color={colors.statusRed} strokeWidth={2} /> : <TrendingDown size={18} color={colors.brandBlue} strokeWidth={2} />}
        <Text style={styles.title}>Stockout Risk</Text>
        <Badge
          label={isHigh ? "High" : isMedium ? "Medium" : "Low"}
          variant={isHigh ? "red" : isMedium ? "yellow" : "green"}
        />
      </View>
      <Text style={styles.forecast}>
        At current usage ({avgDailyUsage.toFixed(1)}/day), stock will run out in{" "}
        <Text style={styles.bold}>{daysUntilStockout} days</Text>.
      </Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  title: { ...typography.cardTitle, color: colors.navy, flex: 1 },
  forecast: { ...typography.body, color: colors.textSecondary, marginTop: spacing.md },
  bold: { fontWeight: "700", color: colors.navy },
});
