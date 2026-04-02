/**
 * LowStockList — items below reorder point with qty display.
 * Matches web's low-stock-list.tsx.
 */
import { StyleSheet, View, Text, Pressable } from "react-native";
import { AlertTriangle, ChevronRight } from "lucide-react-native";
import { Card } from "@/components/ui/Card";
import { colors } from "@/constants/colors";
import { type as typography } from "@/constants/typography";
import { spacing, radius } from "@/constants/layout";
import { formatQuantity } from "@/lib/utils";
import type { LowStockItem } from "@/types/api";

interface LowStockListProps {
  items: LowStockItem[];
}

export function LowStockList({ items }: LowStockListProps) {
  if (items.length === 0) return null;

  return (
    <Card>
      <View style={styles.header}>
        <View style={styles.iconBox}>
          <AlertTriangle size={16} color={colors.statusYellow} strokeWidth={2} />
        </View>
        <Text style={styles.title}>Needs Attention</Text>
      </View>

      {items.map((item, i) => (
        <Pressable
          key={item.id}
          style={[styles.row, i < items.length - 1 && styles.rowBorder]}
        >
          <View style={styles.nameCol}>
            <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
          </View>
          <View style={styles.qtyCol}>
            <Text style={styles.qty}>
              {formatQuantity(item.currentQty)} {item.unit}
            </Text>
            <Text style={styles.reorder}>
              Reorder at {formatQuantity(item.reorderPoint)}
            </Text>
          </View>
          <ChevronRight size={16} color="rgba(107, 127, 150, 0.4)" strokeWidth={1.5} />
        </Pressable>
      ))}

      <Pressable style={styles.viewAll}>
        <Text style={styles.viewAllText}>View all low stock</Text>
        <ChevronRight size={16} color={colors.brandBlue} strokeWidth={2} />
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: radius.xl,
    backgroundColor: colors.statusYellowBg,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    ...typography.cardTitle,
    color: colors.navy,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(226, 230, 235, 0.6)",
  },
  nameCol: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    ...typography.subtitle,
    fontWeight: "600",
    color: colors.navy,
  },
  qtyCol: {
    alignItems: "flex-end",
    marginLeft: spacing.md,
  },
  qty: {
    ...typography.subtitle,
    fontWeight: "700",
    color: colors.statusYellow,
    fontVariant: ["tabular-nums"],
  },
  reorder: {
    ...typography.caption,
    color: colors.textMuted,
    fontVariant: ["tabular-nums"],
    marginTop: 1,
  },
  viewAll: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(226, 230, 235, 0.6)",
  },
  viewAllText: {
    ...typography.subtitle,
    fontWeight: "600",
    color: colors.brandBlue,
  },
});
