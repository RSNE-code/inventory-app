/**
 * RecentActivity — last 5 transactions with color-coded quantities.
 * Matches web's dashboard page inline recent activity section.
 */
import { StyleSheet, View, Text } from "react-native";
import { Card } from "@/components/ui/Card";
import { colors } from "@/constants/colors";
import { type as typography } from "@/constants/typography";
import { spacing } from "@/constants/layout";
import { formatQuantity } from "@/lib/utils";
import type { RecentTransaction } from "@/types/api";

const POSITIVE_TYPES = ["RECEIVE", "RETURN_FULL", "RETURN_PARTIAL", "PRODUCE", "ADJUST_UP"];

const TYPE_LABELS: Record<string, string> = {
  RECEIVE: "Received",
  CHECKOUT: "Checked Out",
  ADDITIONAL_PICKUP: "Pickup",
  RETURN_FULL: "Returned",
  RETURN_PARTIAL: "Partial Return",
  RETURN_SCRAP: "Scrapped",
  CONSUME: "Consumed",
  PRODUCE: "Produced",
  SHIP: "Shipped",
  ADJUST_UP: "Adjusted +",
  ADJUST_DOWN: "Adjusted -",
};

interface RecentActivityProps {
  transactions: RecentTransaction[];
}

export function RecentActivity({ transactions }: RecentActivityProps) {
  if (transactions.length === 0) return null;

  return (
    <Card>
      <Text style={styles.title}>Recent Activity</Text>
      {transactions.slice(0, 5).map((t, i) => {
        const isPositive = POSITIVE_TYPES.includes(t.type);
        return (
          <View
            key={t.id}
            style={[styles.row, i < Math.min(transactions.length, 5) - 1 && styles.rowBorder]}
          >
            <View style={styles.textCol}>
              <Text style={styles.productName} numberOfLines={1}>{t.productName}</Text>
              <Text style={styles.meta}>
                {TYPE_LABELS[t.type] || t.type} by {t.userName}
              </Text>
            </View>
            <Text
              style={[
                styles.qty,
                { color: isPositive ? colors.statusGreen : colors.statusRed },
              ]}
            >
              {isPositive ? "+" : "-"}{formatQuantity(t.quantity)}
            </Text>
          </View>
        );
      })}
    </Card>
  );
}

const styles = StyleSheet.create({
  title: {
    ...typography.cardTitle,
    color: colors.navy,
    marginBottom: spacing.md,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.md,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(226, 230, 235, 0.6)",
  },
  textCol: {
    flex: 1,
    minWidth: 0,
  },
  productName: {
    ...typography.subtitle,
    fontWeight: "500",
    color: colors.navy,
  },
  meta: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  qty: {
    ...typography.subtitle,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
    marginLeft: spacing.md,
  },
});
