/**
 * BomConfirmationCard — confirmation display for BOM items.
 */
import { StyleSheet, View, Text } from "react-native";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { colors } from "@/constants/colors";
import { type as typography } from "@/constants/typography";
import { spacing } from "@/constants/layout";
import { formatQuantity } from "@/lib/utils";
import { type StockLevel, stockDotColor, stockLabel } from "@/lib/bom-utils";

interface BomConfirmationCardProps {
  productName: string;
  quantity: number;
  unit: string;
  stockLevel: StockLevel;
  isCustom?: boolean;
}

export function BomConfirmationCard({ productName, quantity, unit, stockLevel, isCustom }: BomConfirmationCardProps) {
  const accent = stockLevel === "out" ? "red" : stockLevel === "low" ? "yellow" : "green";
  return (
    <Card accent={accent} style={styles.card}>
      <View style={styles.row}>
        <View style={styles.info}>
          <Text style={styles.name} numberOfLines={1}>{productName}</Text>
          {isCustom && <Text style={styles.custom}>Custom Item</Text>}
        </View>
        <Badge label={stockLabel[stockLevel]} variant={accent} />
      </View>
      <Text style={styles.qty}>{formatQuantity(quantity)} {unit}</Text>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { padding: spacing.md },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: spacing.sm },
  info: { flex: 1, minWidth: 0 },
  name: { ...typography.subtitle, fontWeight: "600", color: colors.navy },
  custom: { ...typography.caption, color: colors.brandOrange, fontWeight: "600", marginTop: 1 },
  qty: { ...typography.body, color: colors.textSecondary, fontVariant: ["tabular-nums"], marginTop: spacing.xs },
});
