/**
 * Stock adjustment screen — +/- direction, quantity, reason.
 * Matches web's inventory/[id]/adjust/page.tsx.
 */
import { useState } from "react";
import {
  StyleSheet,
  ScrollView,
  View,
  Text,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { ArrowUp, ArrowDown } from "lucide-react-native";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { StockBadge } from "@/components/inventory/StockBadge";
import { LoadingState } from "@/components/shared/LoadingState";
import { useProduct, useAdjustStock } from "@/hooks/use-products";
import { formatQuantity } from "@/lib/utils";
import { colors } from "@/constants/colors";
import { type as typography } from "@/constants/typography";
import { spacing, radius } from "@/constants/layout";

const REASONS = [
  "Physical count correction",
  "Received shipment (no PO)",
  "Damage / waste",
  "Found misplaced stock",
  "Initial inventory load",
  "Other",
];

export default function AdjustStockScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data, isLoading } = useProduct(id!);
  const adjustMutation = useAdjustStock();

  const [direction, setDirection] = useState<"up" | "down">("up");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");

  const product = (data as { data?: Record<string, unknown> })?.data ?? data;

  if (isLoading || !product) {
    return (
      <>
        <Header title="Adjust Stock" showBack />
        <LoadingState fullScreen />
      </>
    );
  }

  const p = product as Record<string, unknown>;
  const currentQty = Number(p.currentQty ?? 0);
  const reorderPoint = Number(p.reorderPoint ?? 0);
  const qty = parseFloat(quantity) || 0;
  const newQty = direction === "up" ? currentQty + qty : currentQty - qty;
  const canSubmit = qty > 0 && reason !== "";

  const handleSubmit = async () => {
    if (!canSubmit) return;
    try {
      await adjustMutation.mutateAsync({
        productId: id!,
        quantity: qty,
        direction,
        reason,
        notes: notes || undefined,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Failed to adjust stock");
    }
  };

  return (
    <>
      <Header title="Adjust Stock" showBack />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        >
          {/* Current stock */}
          <Card style={styles.currentCard}>
            <View style={styles.currentRow}>
              <View>
                <Text style={styles.productName} numberOfLines={1}>
                  {String(p.name)}
                </Text>
                <Text style={styles.currentQty}>
                  Current: {formatQuantity(currentQty)} {String(p.unit ?? "ea")}
                </Text>
              </View>
              <StockBadge currentQty={currentQty} reorderPoint={reorderPoint} />
            </View>
          </Card>

          {/* Direction toggle */}
          <View style={styles.directionRow}>
            <Pressable
              onPress={() => {
                setDirection("up");
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              style={[styles.dirButton, direction === "up" && styles.dirButtonActiveUp]}
            >
              <ArrowUp
                size={20}
                color={direction === "up" ? colors.textInverse : colors.statusGreen}
                strokeWidth={2}
              />
              <Text style={[styles.dirLabel, direction === "up" && styles.dirLabelActive]}>
                Add
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                setDirection("down");
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              style={[styles.dirButton, direction === "down" && styles.dirButtonActiveDown]}
            >
              <ArrowDown
                size={20}
                color={direction === "down" ? colors.textInverse : colors.statusRed}
                strokeWidth={2}
              />
              <Text style={[styles.dirLabel, direction === "down" && styles.dirLabelActive]}>
                Remove
              </Text>
            </Pressable>
          </View>

          {/* Quantity input */}
          <Input
            label="Quantity"
            value={quantity}
            onChangeText={setQuantity}
            placeholder="0"
            keyboardType="decimal-pad"
          />

          {/* Preview */}
          {qty > 0 && (
            <Card style={styles.previewCard}>
              <Text style={styles.previewLabel}>New quantity will be</Text>
              <Text
                style={[
                  styles.previewValue,
                  { color: newQty < 0 ? colors.statusRed : colors.navy },
                ]}
              >
                {formatQuantity(Math.max(0, newQty))} {String(p.unit ?? "ea")}
              </Text>
            </Card>
          )}

          {/* Reason picker */}
          <Text style={styles.reasonTitle}>Reason *</Text>
          <View style={styles.reasonGrid}>
            {REASONS.map((r) => (
              <Pressable
                key={r}
                onPress={() => {
                  setReason(r);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                }}
                style={[styles.reasonChip, reason === r && styles.reasonChipActive]}
              >
                <Text style={[styles.reasonText, reason === r && styles.reasonTextActive]}>
                  {r}
                </Text>
              </Pressable>
            ))}
          </View>

          {/* Notes */}
          <Input
            label="Notes (optional)"
            value={notes}
            onChangeText={setNotes}
            placeholder="Additional context\u2026"
            multiline
            style={{ height: 80 }}
          />

          {/* Submit */}
          <Button
            title={adjustMutation.isPending ? "Adjusting\u2026" : "Confirm Adjustment"}
            onPress={handleSubmit}
            disabled={!canSubmit}
            loading={adjustMutation.isPending}
            size="lg"
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  currentCard: {
    marginBottom: spacing.lg,
  },
  currentRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  productName: {
    ...typography.cardTitle,
    color: colors.navy,
  },
  currentQty: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: 2,
  },
  directionRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  dirButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    height: 52,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  dirButtonActiveUp: {
    backgroundColor: colors.statusGreen,
    borderColor: colors.statusGreen,
  },
  dirButtonActiveDown: {
    backgroundColor: colors.statusRed,
    borderColor: colors.statusRed,
  },
  dirLabel: {
    ...typography.subtitle,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  dirLabelActive: {
    color: colors.textInverse,
  },
  previewCard: {
    marginVertical: spacing.lg,
    alignItems: "center",
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 0,
  },
  previewLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },
  previewValue: {
    ...typography.displayLarge,
    marginTop: 4,
    fontVariant: ["tabular-nums"],
  },
  reasonTitle: {
    ...typography.caption,
    fontWeight: "500",
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },
  reasonGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  reasonChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceSecondary,
  },
  reasonChipActive: {
    backgroundColor: colors.navy,
  },
  reasonText: {
    ...typography.caption,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  reasonTextActive: {
    color: colors.textInverse,
  },
});
