/**
 * PickCheckoutSection — per-item checkout with select-all and qty steppers.
 */
import { useState, useCallback, useMemo } from "react";
import { StyleSheet, View, Text, Pressable } from "react-native";
import { Check, Minus, Plus, ShoppingCart } from "lucide-react-native";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useIsTablet } from "@/lib/hooks/useDeviceType";
import { colors } from "@/constants/colors";
import { type as typography } from "@/constants/typography";
import { spacing, radius } from "@/constants/layout";

interface LineItem {
  id: string;
  productName: string;
  quantity: number;
  checkedOutQty: number;
  unit: string;
}

interface PickCheckoutSectionProps {
  lineItems: LineItem[];
  onCheckout: (selections: { id: string; qty: number }[]) => void;
  loading?: boolean;
}

export function PickCheckoutSection({ lineItems, onCheckout, loading }: PickCheckoutSectionProps) {
  const isTablet = useIsTablet();
  const minTouch = isTablet ? 48 : 44;

  // Only show items with remaining qty
  const checkableItems = useMemo(
    () => lineItems.filter((li) => li.checkedOutQty < li.quantity),
    [lineItems]
  );

  const [selected, setSelected] = useState<Record<string, number>>({});

  const selectedCount = useMemo(
    () => Object.keys(selected).length,
    [selected]
  );

  const allSelected = selectedCount === checkableItems.length && checkableItems.length > 0;

  const handleToggle = useCallback((item: LineItem) => {
    setSelected((prev) => {
      if (prev[item.id] !== undefined) {
        const next = { ...prev };
        delete next[item.id];
        return next;
      }
      return { ...prev, [item.id]: item.quantity - item.checkedOutQty };
    });
  }, []);

  const handleSelectAll = useCallback(() => {
    if (allSelected) {
      setSelected({});
    } else {
      const next: Record<string, number> = {};
      for (const item of checkableItems) {
        next[item.id] = item.quantity - item.checkedOutQty;
      }
      setSelected(next);
    }
  }, [allSelected, checkableItems]);

  const handleQtyChange = useCallback((id: string, delta: number) => {
    setSelected((prev) => {
      const current = prev[id];
      if (current === undefined) return prev;
      const next = Math.max(1, current + delta);
      return { ...prev, [id]: next };
    });
  }, []);

  const handleCheckout = useCallback(() => {
    const selections = Object.entries(selected).map(([id, qty]) => ({ id, qty }));
    if (selections.length > 0) onCheckout(selections);
  }, [selected, onCheckout]);

  if (checkableItems.length === 0) return null;

  return (
    <Card style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Pick & Checkout</Text>
        <Pressable
          onPress={handleSelectAll}
          style={[styles.selectAllBtn, { minHeight: minTouch }]}
        >
          <View style={[styles.checkbox, allSelected ? styles.checkboxChecked : null]}>
            {allSelected ? <Check size={12} color={colors.textInverse} strokeWidth={3} /> : null}
          </View>
          <Text style={styles.selectAllText}>Select All</Text>
        </Pressable>
      </View>

      {checkableItems.map((item) => {
        const isSelected = selected[item.id] !== undefined;
        const qty = selected[item.id] ?? 0;
        const remaining = item.quantity - item.checkedOutQty;

        return (
          <View key={item.id} style={styles.row}>
            <Pressable
              onPress={() => handleToggle(item)}
              style={[styles.checkArea, { minHeight: minTouch }]}
            >
              <View style={[styles.checkbox, isSelected ? styles.checkboxChecked : null]}>
                {isSelected ? <Check size={12} color={colors.textInverse} strokeWidth={3} /> : null}
              </View>
            </Pressable>
            <View style={styles.itemInfo}>
              <Text style={styles.itemName} numberOfLines={1}>{item.productName}</Text>
              <Text style={styles.itemMeta}>{remaining} {item.unit} remaining</Text>
            </View>
            {isSelected ? (
              <View style={styles.stepper}>
                <Pressable
                  onPress={() => handleQtyChange(item.id, -1)}
                  style={[styles.stepBtn, { minWidth: minTouch, minHeight: minTouch }]}
                >
                  <Minus size={16} color={colors.navy} strokeWidth={2} />
                </Pressable>
                <Text style={styles.stepQty}>{qty}</Text>
                <Pressable
                  onPress={() => handleQtyChange(item.id, 1)}
                  style={[styles.stepBtn, { minWidth: minTouch, minHeight: minTouch }]}
                >
                  <Plus size={16} color={colors.navy} strokeWidth={2} />
                </Pressable>
              </View>
            ) : null}
          </View>
        );
      })}

      {selectedCount > 0 ? (
        <Button
          title={`Checkout ${selectedCount} Item${selectedCount !== 1 ? "s" : ""}`}
          icon={<ShoppingCart size={18} color={colors.textInverse} strokeWidth={2} />}
          onPress={handleCheckout}
          loading={loading}
          size="lg"
          style={styles.checkoutBtn}
        />
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginTop: spacing.lg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  title: {
    ...typography.cardTitle,
    color: colors.navy,
  },
  selectAllBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  selectAllText: {
    ...typography.caption,
    fontWeight: "600",
    color: colors.brandBlue,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: radius.sm,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: {
    backgroundColor: colors.brandBlue,
    borderColor: colors.brandBlue,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    gap: spacing.sm,
  },
  checkArea: {
    justifyContent: "center",
    paddingRight: spacing.xs,
  },
  itemInfo: {
    flex: 1,
    minWidth: 0,
  },
  itemName: {
    ...typography.body,
    fontWeight: "500",
    color: colors.navy,
  },
  itemMeta: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 1,
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  stepBtn: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSecondary,
  },
  stepQty: {
    ...typography.subtitle,
    fontWeight: "600",
    color: colors.navy,
    minWidth: 32,
    textAlign: "center",
    fontVariant: ["tabular-nums"],
  },
  checkoutBtn: {
    marginTop: spacing.lg,
  },
});
