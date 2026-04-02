/**
 * ReceiptSummary — summary card for completed receipt.
 */
import { StyleSheet, View, Text } from "react-native";
import { CheckCircle } from "lucide-react-native";
import { Card } from "@/components/ui/Card";
import { ReceiptLineRow } from "./ReceiptLineRow";
import { colors } from "@/constants/colors";
import { type as typography } from "@/constants/typography";
import { spacing, radius } from "@/constants/layout";
import { formatCurrency } from "@/lib/utils";

interface ReceiptSummaryProps {
  supplierName: string;
  items: { productName: string; quantity: number; unitCost: number; unit: string }[];
  totalAmount: number;
}

export function ReceiptSummary({ supplierName, items, totalAmount }: ReceiptSummaryProps) {
  return (
    <Card accent="green">
      <View style={styles.header}>
        <CheckCircle size={24} color={colors.statusGreen} strokeWidth={2} />
        <View>
          <Text style={styles.title}>Receipt Saved</Text>
          <Text style={styles.supplier}>{supplierName}</Text>
        </View>
      </View>
      {items.map((item, i) => (
        <ReceiptLineRow key={i} {...item} />
      ))}
      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={styles.totalValue}>{formatCurrency(totalAmount)}</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginBottom: spacing.lg },
  title: { ...typography.cardTitle, color: colors.navy },
  supplier: { ...typography.caption, color: colors.textMuted },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingTop: spacing.md, marginTop: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  totalLabel: { ...typography.subtitle, fontWeight: "600", color: colors.textSecondary },
  totalValue: { ...typography.sectionTitle, color: colors.navy, fontVariant: ["tabular-nums"] },
});
