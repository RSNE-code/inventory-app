/**
 * ProductCard — product list item with name, qty, location, accent bar.
 * Matches web's product-card.tsx.
 */
import { StyleSheet, View, Text } from "react-native";
import { MapPin, ChevronRight } from "lucide-react-native";
import { Card } from "@/components/ui/Card";
import { StockBadge } from "./StockBadge";
import { colors } from "@/constants/colors";
import { type as typography } from "@/constants/typography";
import { spacing } from "@/constants/layout";
import { formatQuantity, getStockStatus } from "@/lib/utils";
import type { Product } from "@/types/api";

type AccentColor = "green" | "yellow" | "red";

const STATUS_ACCENT: Record<string, AccentColor> = {
  "in-stock": "green",
  low: "yellow",
  out: "red",
};

interface ProductCardProps {
  product: Product;
  onPress: () => void;
}

export function ProductCard({ product, onPress }: ProductCardProps) {
  const qty = Number(product.currentQty);
  const reorder = Number(product.reorderPoint);
  const status = getStockStatus(qty, reorder);

  return (
    <Card accent={STATUS_ACCENT[status]} onPress={onPress}>
      <View style={styles.topRow}>
        <View style={styles.nameCol}>
          <Text style={styles.name} numberOfLines={1}>{product.name}</Text>
          <Text style={styles.category}>{product.category || "Uncategorized"}</Text>
        </View>
        <StockBadge currentQty={qty} reorderPoint={reorder} />
      </View>

      <View style={styles.bottomRow}>
        <View>
          <Text style={styles.qtyValue}>{formatQuantity(qty)}</Text>
          <Text style={styles.qtyUnit}> {product.unit}</Text>
        </View>
        <View style={styles.metaRow}>
          {product.location && (
            <View style={styles.locationRow}>
              <MapPin size={12} color={colors.textMuted} strokeWidth={2} />
              <Text style={styles.locationText}>{product.location}</Text>
            </View>
          )}
          <ChevronRight size={16} color="rgba(107, 127, 150, 0.3)" strokeWidth={1.5} />
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  nameCol: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    ...typography.cardTitle,
    color: colors.navy,
  },
  category: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginTop: spacing.md,
  },
  qtyValue: {
    fontSize: 24,
    fontWeight: "700",
    color: colors.navy,
    fontVariant: ["tabular-nums"],
    letterSpacing: -0.5,
  },
  qtyUnit: {
    ...typography.body,
    color: colors.textMuted,
    fontWeight: "500",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  locationText: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
