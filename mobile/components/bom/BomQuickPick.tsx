/**
 * BomQuickPick — manual BOM creation by searching catalog.
 */
import { useState } from "react";
import { StyleSheet, View, Text, FlatList, Pressable } from "react-native";
import { Plus, Minus, Trash2 } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ProductPicker } from "./ProductPicker";
import { colors } from "@/constants/colors";
import { type as typography } from "@/constants/typography";
import { spacing, radius } from "@/constants/layout";
import { formatQuantity } from "@/lib/utils";
import type { Product } from "@/types/api";

interface PickedItem { productId: string; productName: string; quantity: number; unit: string; }

interface BomQuickPickProps {
  items: PickedItem[];
  onItemsChange: (items: PickedItem[]) => void;
}

export function BomQuickPick({ items, onItemsChange }: BomQuickPickProps) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const addProduct = (product: Product) => {
    const existing = items.find((i) => i.productId === product.id);
    if (existing) {
      onItemsChange(items.map((i) => i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      onItemsChange([...items, { productId: product.id, productName: product.name, quantity: 1, unit: product.unit }]);
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const updateQty = (index: number, delta: number) => {
    const newItems = [...items];
    newItems[index].quantity = Math.max(1, newItems[index].quantity + delta);
    onItemsChange(newItems);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const removeItem = (index: number) => {
    onItemsChange(items.filter((_, i) => i !== index));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  };

  return (
    <View style={styles.container}>
      <Button title="Add Product" variant="secondary" icon={<Plus size={18} color={colors.textPrimary} strokeWidth={2} />}
        onPress={() => setPickerOpen(true)} />

      {items.map((item, i) => (
        <Card key={item.productId} style={styles.itemCard}>
          <View style={styles.itemRow}>
            <View style={styles.itemInfo}>
              <Text style={styles.itemName} numberOfLines={1}>{item.productName}</Text>
              <Text style={styles.itemUnit}>{item.unit}</Text>
            </View>
            <View style={styles.stepper}>
              <Pressable style={styles.stepBtn} onPress={() => updateQty(i, -1)}>
                <Minus size={16} color={colors.textSecondary} strokeWidth={2} />
              </Pressable>
              <Text style={styles.qty}>{formatQuantity(item.quantity)}</Text>
              <Pressable style={styles.stepBtn} onPress={() => updateQty(i, 1)}>
                <Plus size={16} color={colors.textSecondary} strokeWidth={2} />
              </Pressable>
            </View>
            <Pressable onPress={() => removeItem(i)} hitSlop={8}>
              <Trash2 size={18} color={colors.statusRed} strokeWidth={1.8} />
            </Pressable>
          </View>
        </Card>
      ))}

      <ProductPicker
        visible={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={addProduct}
        excludeIds={items.map((i) => i.productId)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.md },
  itemCard: { padding: spacing.md },
  itemRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  itemInfo: { flex: 1, minWidth: 0 },
  itemName: { ...typography.subtitle, fontWeight: "500", color: colors.navy },
  itemUnit: { ...typography.caption, color: colors.textMuted },
  stepper: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  stepBtn: { width: 44, height: 44, borderRadius: radius.lg, backgroundColor: colors.surfaceSecondary, alignItems: "center", justifyContent: "center" },
  qty: { ...typography.subtitle, fontWeight: "700", color: colors.navy, minWidth: 32, textAlign: "center", fontVariant: ["tabular-nums"] },
});
