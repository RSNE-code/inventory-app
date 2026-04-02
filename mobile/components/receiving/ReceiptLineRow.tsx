/**
 * ReceiptLineRow — single line item in a receipt.
 */
import { StyleSheet, View, Text } from "react-native";
import { colors } from "@/constants/colors";
import { type as typography } from "@/constants/typography";
import { spacing } from "@/constants/layout";
import { formatQuantity, formatCurrency } from "@/lib/utils";

interface ReceiptLineRowProps {
  productName: string;
  quantity: number;
  unitCost: number;
  unit: string;
}

export function ReceiptLineRow({ productName, quantity, unitCost, unit }: ReceiptLineRowProps) {
  return (
    <View style={styles.row}>
      <Text style={styles.name} numberOfLines={1}>{productName}</Text>
      <View style={styles.right}>
        <Text style={styles.qty}>{formatQuantity(quantity)} {unit}</Text>
        <Text style={styles.cost}>{formatCurrency(unitCost)} ea</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "rgba(226,230,235,0.4)" },
  name: { ...typography.subtitle, fontWeight: "500", color: colors.navy, flex: 1, minWidth: 0 },
  right: { alignItems: "flex-end", marginLeft: spacing.md },
  qty: { ...typography.subtitle, fontWeight: "600", color: colors.navy, fontVariant: ["tabular-nums"] },
  cost: { ...typography.caption, color: colors.textMuted, fontVariant: ["tabular-nums"] },
});
