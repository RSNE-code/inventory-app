/**
 * POReceiveCard — receive items against a specific PO.
 */
import { StyleSheet, View, Text } from "react-native";
import { Package } from "lucide-react-native";
import { Card } from "@/components/ui/Card";
import { colors } from "@/constants/colors";
import { type as typography } from "@/constants/typography";
import { spacing } from "@/constants/layout";

interface POLineItem { id: string; productName: string; qtyOrdered: number; qtyReceived: number; }

interface POReceiveCardProps {
  poNumber: string;
  lineItems: POLineItem[];
}

export function POReceiveCard({ poNumber, lineItems }: POReceiveCardProps) {
  return (
    <Card accent="blue">
      <View style={styles.header}>
        <Package size={18} color={colors.brandBlue} strokeWidth={2} />
        <Text style={styles.title}>PO #{poNumber}</Text>
      </View>
      <View style={styles.colHeaders}>
        <Text style={[styles.colHeader, styles.itemCol]}>Item</Text>
        <Text style={styles.colHeader}>Ord</Text>
        <Text style={styles.colHeader}>Rcvd</Text>
        <Text style={styles.colHeader}>Open</Text>
      </View>
      {lineItems.map((li) => {
        const remaining = Math.max(0, li.qtyOrdered - li.qtyReceived);
        const isComplete = remaining === 0;
        return (
          <View key={li.id} style={[styles.row, isComplete && styles.rowComplete]}>
            <Text style={[styles.itemName, styles.itemCol]} numberOfLines={1}>{li.productName}</Text>
            <Text style={styles.qty}>{li.qtyOrdered}</Text>
            <Text style={[styles.qty, li.qtyReceived > 0 && styles.qtyReceived]}>{li.qtyReceived}</Text>
            <Text style={[styles.qty, remaining > 0 && styles.qtyOpen]}>{remaining}</Text>
          </View>
        );
      })}
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.md },
  title: { ...typography.cardTitle, color: colors.navy },
  colHeaders: { flexDirection: "row", paddingBottom: spacing.xs, borderBottomWidth: 1, borderBottomColor: colors.border },
  colHeader: { ...typography.label, color: colors.textMuted, width: 40, textAlign: "center", fontSize: 10 },
  itemCol: { flex: 1 },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "rgba(226,230,235,0.4)" },
  rowComplete: { opacity: 0.4 },
  itemName: { ...typography.caption, fontWeight: "600", color: colors.navy },
  qty: { ...typography.caption, fontWeight: "700", color: colors.navy, width: 40, textAlign: "center", fontVariant: ["tabular-nums"] },
  qtyReceived: { color: colors.brandOrange },
  qtyOpen: { color: colors.statusRed },
});
