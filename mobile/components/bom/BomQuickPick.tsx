/**
 * BomQuickPick — manual BOM creation by searching catalog with category tabs.
 */
import { useState, useCallback, useMemo } from "react";
import { StyleSheet, View, Text, ScrollView, Pressable } from "react-native";
import { Plus, Minus, Trash2, PackagePlus } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SearchInput } from "@/components/ui/SearchInput";
import { ProductPicker } from "./ProductPicker";
import { useCategories } from "@/hooks/use-products";
import { useIsTablet } from "@/lib/hooks/useDeviceType";
import { colors } from "@/constants/colors";
import { type as typography } from "@/constants/typography";
import { spacing, radius, touchTarget } from "@/constants/layout";
import { formatQuantity } from "@/lib/utils";
import type { Product } from "@/types/api";

interface PickedItem { productId: string; productName: string; quantity: number; unit: string; }

interface BomQuickPickProps {
  items: PickedItem[];
  onItemsChange: (items: PickedItem[]) => void;
  onAddCustomItem?: () => void;
}

export function BomQuickPick({ items, onItemsChange, onAddCustomItem }: BomQuickPickProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const { data: categoriesData } = useCategories();
  const isTablet = useIsTablet();
  const minTarget = isTablet ? touchTarget.tablet : touchTarget.phone;

  const categories = useMemo(() => {
    const raw = (categoriesData as any)?.data ?? categoriesData ?? [];
    return Array.isArray(raw) ? raw as { id: string; name: string }[] : [];
  }, [categoriesData]);

  const addProduct = useCallback((product: Product) => {
    const existing = items.find((i) => i.productId === product.id);
    if (existing) {
      onItemsChange(items.map((i) => i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      onItemsChange([...items, { productId: product.id, productName: product.name, quantity: 1, unit: product.unit }]);
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, [items, onItemsChange]);

  const updateQty = useCallback((index: number, delta: number) => {
    const newItems = [...items];
    newItems[index].quantity = Math.max(1, newItems[index].quantity + delta);
    onItemsChange(newItems);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [items, onItemsChange]);

  const removeItem = useCallback((index: number) => {
    onItemsChange(items.filter((_, i) => i !== index));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  }, [items, onItemsChange]);

  const handleCategoryPress = useCallback((catId: string) => {
    setSelectedCategory((prev) => (prev === catId ? null : catId));
  }, []);

  return (
    <View style={styles.container}>
      {/* Search */}
      <SearchInput
        value={search}
        onChangeText={setSearch}
        placeholder="Search products\u2026"
      />

      {/* Category tabs — horizontal scroll */}
      {categories.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryScroll}
          style={styles.categoryBar}
        >
          <Pressable
            style={[styles.categoryPill, !selectedCategory && styles.categoryPillActive]}
            onPress={() => setSelectedCategory(null)}
          >
            <Text style={[styles.categoryText, !selectedCategory && styles.categoryTextActive]}>All</Text>
          </Pressable>
          {categories.map((cat) => (
            <Pressable
              key={cat.id}
              style={[styles.categoryPill, selectedCategory === cat.id && styles.categoryPillActive]}
              onPress={() => handleCategoryPress(cat.id)}
            >
              <Text style={[styles.categoryText, selectedCategory === cat.id && styles.categoryTextActive]}>
                {cat.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      <Button
        title="Browse Products"
        variant="secondary"
        icon={<Plus size={18} color={colors.textPrimary} strokeWidth={2} />}
        onPress={() => setPickerOpen(true)}
      />

      {/* Empty state: custom item prompt */}
      {items.length === 0 && onAddCustomItem ? (
        <Pressable style={styles.customItemPrompt} onPress={onAddCustomItem}>
          <PackagePlus size={24} color={colors.brandBlue} strokeWidth={1.5} />
          <View style={styles.customItemPromptText}>
            <Text style={styles.customItemTitle}>Add custom item</Text>
            <Text style={styles.customItemSub}>Item not in catalog? Add it manually</Text>
          </View>
        </Pressable>
      ) : null}

      {/* Picked items */}
      {items.map((item, i) => (
        <Card key={item.productId} style={styles.itemCard}>
          <View style={styles.itemRow}>
            <View style={styles.itemInfo}>
              <Text style={styles.itemName} numberOfLines={1}>{item.productName}</Text>
              <Text style={styles.itemUnit}>{item.unit}</Text>
            </View>
            <View style={styles.stepper}>
              <Pressable
                style={[styles.stepBtn, { minWidth: minTarget, minHeight: minTarget }]}
                onPress={() => updateQty(i, -1)}
              >
                <Minus size={16} color={colors.textSecondary} strokeWidth={2} />
              </Pressable>
              <Text style={styles.qty}>{formatQuantity(item.quantity)}</Text>
              <Pressable
                style={[styles.stepBtn, { minWidth: minTarget, minHeight: minTarget }]}
                onPress={() => updateQty(i, 1)}
              >
                <Plus size={16} color={colors.textSecondary} strokeWidth={2} />
              </Pressable>
            </View>
            <Pressable
              style={{ minWidth: minTarget, minHeight: minTarget, alignItems: "center", justifyContent: "center" }}
              onPress={() => removeItem(i)}
            >
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
  categoryBar: { flexGrow: 0 },
  categoryScroll: { gap: spacing.sm, paddingVertical: spacing.xs },
  categoryPill: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceSecondary,
    minHeight: 36,
    justifyContent: "center",
  },
  categoryPillActive: {
    backgroundColor: colors.navy,
  },
  categoryText: {
    ...typography.caption,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  categoryTextActive: {
    color: colors.textInverse,
  },
  customItemPrompt: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: "dashed",
    borderRadius: radius.lg,
    padding: spacing.lg,
  },
  customItemPromptText: { flex: 1 },
  customItemTitle: { ...typography.subtitle, fontWeight: "600", color: colors.navy },
  customItemSub: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  itemCard: { padding: spacing.md },
  itemRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  itemInfo: { flex: 1, minWidth: 0 },
  itemName: { ...typography.subtitle, fontWeight: "500", color: colors.navy },
  itemUnit: { ...typography.caption, color: colors.textMuted },
  stepper: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  stepBtn: { borderRadius: radius.lg, backgroundColor: colors.surfaceSecondary, alignItems: "center", justifyContent: "center" },
  qty: { ...typography.subtitle, fontWeight: "700", color: colors.navy, minWidth: 32, textAlign: "center", fontVariant: ["tabular-nums"] },
});
