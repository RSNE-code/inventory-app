/**
 * CartBar — sticky bottom bar for BOM creation showing item count,
 * expandable cart list with qty steppers, and custom item form.
 */
import { useState, useCallback } from "react";
import { StyleSheet, View, Text, Pressable, FlatList, TextInput } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeInDown,
  FadeOutDown,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { ShoppingCart, ChevronUp, ChevronDown, Plus, Minus, Trash2, X } from "lucide-react-native";
import { Button } from "@/components/ui/Button";
import { useIsTablet } from "@/lib/hooks/useDeviceType";
import { colors } from "@/constants/colors";
import { type as typography } from "@/constants/typography";
import { spacing, radius, touchTarget } from "@/constants/layout";
import { SPRING_CONFIG } from "@/constants/animations";

interface CartItem {
  productName: string;
  quantity: number;
  unit: string;
  productId?: string;
}

interface CartBarProps {
  items: CartItem[];
  onUpdateQty: (index: number, qty: number) => void;
  onRemove: (index: number) => void;
  onAddCustom: (item: CartItem) => void;
}

const COLLAPSED_HEIGHT = 56;
const EXPANDED_MAX_HEIGHT = 400;

export function CartBar({ items, onUpdateQty, onRemove, onAddCustom }: CartBarProps) {
  const insets = useSafeAreaInsets();
  const isTablet = useIsTablet();
  const [expanded, setExpanded] = useState(false);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customName, setCustomName] = useState("");
  const [customQty, setCustomQty] = useState("1");
  const [customUnit, setCustomUnit] = useState("EA");

  const expandAnim = useSharedValue(0);

  const handleToggle = useCallback(() => {
    setExpanded((prev) => {
      const next = !prev;
      expandAnim.value = withSpring(next ? 1 : 0, SPRING_CONFIG);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      return next;
    });
  }, [expandAnim]);

  const handleAddCustom = useCallback(() => {
    if (!customName.trim()) return;
    onAddCustom({
      productName: customName.trim(),
      quantity: Math.max(1, Number(customQty) || 1),
      unit: customUnit.trim() || "EA",
    });
    setCustomName("");
    setCustomQty("1");
    setCustomUnit("EA");
    setShowCustomForm(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [customName, customQty, customUnit, onAddCustom]);

  const expandedStyle = useAnimatedStyle(() => ({
    maxHeight: COLLAPSED_HEIGHT + expandAnim.value * EXPANDED_MAX_HEIGHT,
  }));

  const totalItems = items.reduce((sum, it) => sum + it.quantity, 0);
  const minTarget = isTablet ? touchTarget.tablet : touchTarget.phone;

  if (items.length === 0) return null;

  const renderCartItem = useCallback(({ item, index }: { item: CartItem; index: number }) => (
    <View style={styles.cartItem}>
      <Text style={styles.cartItemName} numberOfLines={1}>{item.productName}</Text>
      <View style={styles.stepper}>
        <Pressable
          style={[styles.stepBtn, { minWidth: minTarget, minHeight: minTarget }]}
          onPress={() => onUpdateQty(index, Math.max(0, item.quantity - 1))}
        >
          <Minus size={14} color={colors.navy} strokeWidth={2.5} />
        </Pressable>
        <Text style={styles.stepQty}>{item.quantity}</Text>
        <Pressable
          style={[styles.stepBtn, { minWidth: minTarget, minHeight: minTarget }]}
          onPress={() => onUpdateQty(index, item.quantity + 1)}
        >
          <Plus size={14} color={colors.navy} strokeWidth={2.5} />
        </Pressable>
      </View>
      <Text style={styles.cartUnit}>{item.unit}</Text>
      <Pressable
        style={[styles.removeBtn, { minWidth: minTarget, minHeight: minTarget }]}
        onPress={() => { onRemove(index); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
      >
        <Trash2 size={14} color={colors.statusRed} strokeWidth={2} />
      </Pressable>
    </View>
  ), [minTarget, onUpdateQty, onRemove]);

  const keyExtractor = useCallback((_: CartItem, index: number) => `cart-${index}`, []);

  return (
    <Animated.View
      style={[
        styles.container,
        { paddingBottom: insets.bottom + spacing.sm },
        isTablet && styles.containerTablet,
        expandedStyle,
      ]}
    >
      {/* Collapsed header — always visible */}
      <Pressable style={styles.header} onPress={handleToggle}>
        <View style={styles.headerLeft}>
          <ShoppingCart size={20} color={colors.textInverse} strokeWidth={2} />
          <View style={styles.countBadge}>
            <Text style={styles.countText}>{totalItems}</Text>
          </View>
        </View>
        <Text style={styles.headerTitle}>
          {items.length} item{items.length !== 1 ? "s" : ""} in cart
        </Text>
        {expanded ? (
          <ChevronDown size={20} color={colors.textInverse} strokeWidth={2} />
        ) : (
          <ChevronUp size={20} color={colors.textInverse} strokeWidth={2} />
        )}
      </Pressable>

      {/* Expanded content */}
      {expanded ? (
        <Animated.View entering={FadeInDown.springify().damping(20)} exiting={FadeOutDown}>
          <FlatList
            data={items}
            keyExtractor={keyExtractor}
            renderItem={renderCartItem}
            style={styles.cartList}
            nestedScrollEnabled
            maxToRenderPerBatch={10}
          />
          {showCustomForm ? (
            <View style={styles.customForm}>
              <View style={styles.customRow}>
                <TextInput
                  style={styles.customInput}
                  value={customName}
                  onChangeText={setCustomName}
                  placeholder="Item name"
                  placeholderTextColor={colors.textMuted}
                />
                <TextInput
                  style={[styles.customInput, styles.customQtyInput]}
                  value={customQty}
                  onChangeText={setCustomQty}
                  placeholder="Qty"
                  keyboardType="decimal-pad"
                  placeholderTextColor={colors.textMuted}
                />
                <TextInput
                  style={[styles.customInput, styles.customUnitInput]}
                  value={customUnit}
                  onChangeText={setCustomUnit}
                  placeholder="Unit"
                  placeholderTextColor={colors.textMuted}
                />
              </View>
              <View style={styles.customActions}>
                <Button title="Add" onPress={handleAddCustom} size="sm" />
                <Pressable onPress={() => setShowCustomForm(false)}>
                  <X size={20} color={colors.textMuted} strokeWidth={2} />
                </Pressable>
              </View>
            </View>
          ) : (
            <Pressable style={styles.addCustomBtn} onPress={() => setShowCustomForm(true)}>
              <Plus size={16} color={colors.brandBlue} strokeWidth={2} />
              <Text style={styles.addCustomText}>Add custom item</Text>
            </Pressable>
          )}
        </Animated.View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.navy,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    overflow: "hidden",
  },
  containerTablet: {
    maxWidth: 600,
    alignSelf: "center",
    left: "auto" as any,
    right: "auto" as any,
    borderRadius: radius.xl,
    marginBottom: spacing.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: COLLAPSED_HEIGHT,
    paddingHorizontal: spacing.lg,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  countBadge: {
    backgroundColor: colors.brandOrange,
    borderRadius: radius.full,
    minWidth: 22,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xs,
  },
  countText: {
    ...typography.caption,
    fontWeight: "700",
    color: colors.textInverse,
    fontSize: 11,
  },
  headerTitle: {
    ...typography.subtitle,
    fontWeight: "600",
    color: colors.textInverse,
    flex: 1,
    textAlign: "center",
  },
  cartList: {
    maxHeight: 240,
    paddingHorizontal: spacing.lg,
  },
  cartItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.15)",
  },
  cartItemName: {
    ...typography.body,
    color: colors.textInverse,
    flex: 1,
    minWidth: 0,
  },
  stepper: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  stepBtn: {
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  stepQty: {
    ...typography.subtitle,
    fontWeight: "700",
    color: colors.textInverse,
    fontVariant: ["tabular-nums"],
    minWidth: 28,
    textAlign: "center",
  },
  cartUnit: {
    ...typography.caption,
    color: "rgba(255,255,255,0.6)",
    width: 32,
    textAlign: "right",
  },
  removeBtn: {
    alignItems: "center",
    justifyContent: "center",
  },
  customForm: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.15)",
  },
  customRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  customInput: {
    ...typography.body,
    color: colors.textInverse,
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    flex: 1,
    minHeight: 44,
  },
  customQtyInput: {
    flex: 0,
    width: 60,
    textAlign: "center",
  },
  customUnitInput: {
    flex: 0,
    width: 60,
    textAlign: "center",
  },
  customActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.sm,
  },
  addCustomBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
    paddingVertical: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.15)",
  },
  addCustomText: {
    ...typography.subtitle,
    color: colors.brandBlue,
    fontWeight: "600",
  },
});
