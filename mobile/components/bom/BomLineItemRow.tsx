/**
 * BomLineItemRow — single line item in BOM detail with checkout indicator.
 */
import { StyleSheet, View, Text } from "react-native";
import { Check } from "lucide-react-native";
import { colors } from "@/constants/colors";
import { type as typography } from "@/constants/typography";
import { spacing, radius } from "@/constants/layout";
import { formatQuantity } from "@/lib/utils";
import type { BomLineItem } from "@/types/api";

interface BomLineItemRowProps {
  item: BomLineItem;
  showCheckout?: boolean;
}

export function BomLineItemRow({ item, showCheckout = false }: BomLineItemRowProps) {
  const isFullyCheckedOut = item.checkedOutQty >= item.quantity;
  const hasPartial = item.checkedOutQty > 0 && !isFullyCheckedOut;

  return (
    <View style={[styles.row, isFullyCheckedOut && styles.rowDone]}>
      {showCheckout && (
        <View style={[styles.checkCircle, isFullyCheckedOut && styles.checkCircleDone]}>
          {isFullyCheckedOut && <Check size={14} color={colors.textInverse} strokeWidth={3} />}
        </View>
      )}
      <View style={styles.nameCol}>
        <Text style={[styles.name, isFullyCheckedOut && styles.nameDone]} numberOfLines={1}>
          {item.productName}
        </Text>
        {item.isCustom && <Text style={styles.customTag}>Custom</Text>}
      </View>
      <View style={styles.qtyCol}>
        <Text style={styles.qty}>
          {showCheckout && hasPartial
            ? `${formatQuantity(item.checkedOutQty)}/${formatQuantity(item.quantity)}`
            : formatQuantity(item.quantity)}
        </Text>
        <Text style={styles.unit}>{item.unit}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(226, 230, 235, 0.4)",
  },
  rowDone: {
    opacity: 0.5,
  },
  checkCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2.5,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  checkCircleDone: {
    borderColor: colors.statusGreen,
    backgroundColor: colors.statusGreen,
  },
  nameCol: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    ...typography.subtitle,
    fontWeight: "500",
    color: colors.navy,
  },
  nameDone: {
    textDecorationLine: "line-through",
  },
  customTag: {
    ...typography.caption,
    color: colors.brandOrange,
    fontWeight: "600",
    marginTop: 1,
  },
  qtyCol: {
    alignItems: "flex-end",
  },
  qty: {
    ...typography.subtitle,
    fontWeight: "700",
    color: colors.navy,
    fontVariant: ["tabular-nums"],
  },
  unit: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
