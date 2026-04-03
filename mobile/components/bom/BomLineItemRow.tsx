/**
 * BomLineItemRow — single line item in BOM detail with checkout indicator,
 * unit pill, tier badge, fabrication source, and checkout progress.
 */
import { StyleSheet, View, Text } from "react-native";
import { Check, Wrench, Truck, AlertTriangle } from "lucide-react-native";
import { colors } from "@/constants/colors";
import { type as typography } from "@/constants/typography";
import { spacing, radius } from "@/constants/layout";
import { formatQuantity } from "@/lib/utils";
import type { BomLineItem } from "@/types/api";

interface BomLineItemRowProps {
  item: BomLineItem;
  showCheckout?: boolean;
  /** BOM status — used for "No fab order" warning (only on APPROVED/IN_PROGRESS) */
  bomStatus?: string;
}

export function BomLineItemRow({ item, showCheckout = false, bomStatus }: BomLineItemRowProps) {
  const isFullyCheckedOut = item.checkedOutQty >= item.quantity;
  const hasPartial = item.checkedOutQty > 0 && !isFullyCheckedOut;
  const isTier2 = item.tier === "TIER_2";
  const isRsneMade = item.fabricationSource === "RSNE_MADE";
  const isSupplierSourced = item.fabricationSource === "SUPPLIER";
  const hasFabSource = isRsneMade || isSupplierSourced;
  const qtyReturned = item.qtyReturned ?? 0;

  // "No fab order" warning: RSNE_MADE items with no linked assembly in APPROVED/IN_PROGRESS BOMs
  const showNoFabWarning =
    isRsneMade &&
    !item.assemblyId &&
    (bomStatus === "APPROVED" || bomStatus === "IN_PROGRESS");

  // Checkout progress detail
  const showCheckoutDetail = showCheckout && (hasPartial || isFullyCheckedOut);

  return (
    <View style={[styles.row, isFullyCheckedOut && styles.rowDone]}>
      {showCheckout ? (
        <View style={[styles.checkCircle, isFullyCheckedOut && styles.checkCircleDone]}>
          {isFullyCheckedOut ? <Check size={14} color={colors.textInverse} strokeWidth={3} /> : null}
        </View>
      ) : null}
      <View style={styles.nameCol}>
        <Text style={[styles.name, isFullyCheckedOut && styles.nameDone]} numberOfLines={1}>
          {item.productName}
        </Text>
        {/* Badges row */}
        <View style={styles.badgeRow}>
          {item.isCustom ? (
            <Text style={styles.customTag}>
              {item.nonCatalogCategory ? item.nonCatalogCategory : "Custom"}
            </Text>
          ) : null}
          {isTier2 ? (
            <View style={styles.t2Badge}>
              <Text style={styles.t2Text}>T2</Text>
            </View>
          ) : null}
          {hasFabSource ? (
            <View style={[styles.fabBadge, isRsneMade ? styles.fabInHouse : styles.fabSupplier]}>
              {isRsneMade ? (
                <Wrench size={10} color={colors.statusGreen} strokeWidth={2.5} />
              ) : (
                <Truck size={10} color={colors.brandBlue} strokeWidth={2.5} />
              )}
              <Text style={[styles.fabText, isRsneMade ? styles.fabTextInHouse : styles.fabTextSupplier]}>
                {isRsneMade ? "In-house" : "Supplier"}
              </Text>
            </View>
          ) : null}
          {showNoFabWarning ? (
            <View style={styles.noFabBadge}>
              <AlertTriangle size={10} color={colors.statusYellow} strokeWidth={2.5} />
              <Text style={styles.noFabText}>No fab order</Text>
            </View>
          ) : null}
        </View>
        {/* Checkout progress detail */}
        {showCheckoutDetail ? (
          <Text style={styles.checkoutDetail}>
            {formatQuantity(item.checkedOutQty)}/{formatQuantity(item.quantity)} {item.unit} pulled
            {qtyReturned > 0 ? ` · ${formatQuantity(qtyReturned)} ret` : ""}
            {item.pickupDate
              ? ` · Pulled ${new Date(item.pickupDate).toLocaleDateString(undefined, { month: "short", day: "numeric" })}`
              : ""}
          </Text>
        ) : null}
      </View>
      <View style={styles.qtyCol}>
        <Text style={styles.qty}>
          {showCheckout && hasPartial
            ? `${formatQuantity(item.checkedOutQty)}/${formatQuantity(item.quantity)}`
            : formatQuantity(item.quantity)}
        </Text>
        <View style={styles.unitPill}>
          <Text style={styles.unitPillText}>{item.unit}</Text>
        </View>
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
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    marginTop: 2,
  },
  customTag: {
    ...typography.caption,
    color: colors.brandOrange,
    fontWeight: "600",
  },
  t2Badge: {
    backgroundColor: "rgba(147, 51, 234, 0.15)",
    borderRadius: radius.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: 1,
  },
  t2Text: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: "700",
    color: "rgba(147, 51, 234, 1)",
  },
  fabBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: 1,
  },
  fabInHouse: {
    backgroundColor: colors.statusGreenBg,
  },
  fabSupplier: {
    backgroundColor: colors.statusBlueBg,
  },
  fabText: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: "600",
  },
  fabTextInHouse: {
    color: colors.statusGreen,
  },
  fabTextSupplier: {
    color: colors.brandBlue,
  },
  noFabBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: colors.statusYellowBg,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: 1,
  },
  noFabText: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: "600",
    color: colors.statusYellow,
  },
  checkoutDetail: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
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
  unitPill: {
    backgroundColor: "rgba(46, 125, 186, 0.15)",
    borderRadius: radius.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: 1,
    marginTop: 2,
  },
  unitPillText: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: "600",
    color: colors.brandBlue,
  },
});
