/**
 * BomDetailContent — reusable BOM detail view.
 * Used both in the [id] route (standalone) and in the BOMs tab SplitView (inline).
 */
import { StyleSheet, ScrollView, View, Text, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Send, CheckCircle, Trash2, ShoppingCart } from "lucide-react-native";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { BomStatusBadge } from "@/components/bom/BomStatusBadge";
import { BomLineItemRow } from "@/components/bom/BomLineItemRow";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { useBom, useSubmitForReview, useDeleteBom, useCheckoutBom } from "@/hooks/use-boms";
import { useResponsiveSpacing } from "@/lib/hooks/useDeviceType";
import { colors } from "@/constants/colors";
import { type as typography } from "@/constants/typography";
import { spacing } from "@/constants/layout";
import { CARD_ENTER_DELAY } from "@/constants/animations";

interface BomDetailContentProps {
  bomId: string;
  /** Called when the BOM is deleted (e.g. to clear SplitView selection) */
  onDeleted?: () => void;
  /** If true, renders without its own scroll — parent handles scrolling */
  inline?: boolean;
}

export function BomDetailContent({ bomId, onDeleted, inline }: BomDetailContentProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { screenPadding } = useResponsiveSpacing();
  const { data, isLoading, error, refetch } = useBom(bomId);
  const submitReview = useSubmitForReview();
  const deleteBom = useDeleteBom();
  const checkoutMutation = useCheckoutBom();

  const bom = (data as any)?.data ?? data;

  if (isLoading) return <LoadingState />;

  if (error || !bom) {
    return <ErrorState message="BOM not found" onRetry={() => refetch()} />;
  }

  const b = bom as Record<string, unknown>;
  const status = String(b.status ?? "DRAFT");
  const lineItems = (b.lineItems as Array<Record<string, unknown>>) ?? [];
  const isDraft = status === "DRAFT";
  const isApproved = status === "APPROVED";
  const isInProgress = status === "IN_PROGRESS";
  const showCheckout = isApproved || isInProgress;

  const handleSubmitReview = async () => {
    try {
      await submitReview.mutateAsync(bomId);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert("Error", "Failed to submit for review");
    }
  };

  const handleDelete = () => {
    Alert.alert("Delete BOM", "Are you sure? This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteBom.mutateAsync(bomId);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            if (onDeleted) {
              onDeleted();
            } else {
              router.back();
            }
          } catch {
            Alert.alert("Error", "Failed to delete BOM");
          }
        },
      },
    ]);
  };

  const handleCheckoutAll = async () => {
    const unchecked = lineItems
      .filter((li) => Number(li.checkedOutQty ?? 0) < Number(li.quantity ?? 0))
      .map((li) => String(li.id));
    if (unchecked.length === 0) return;
    try {
      await checkoutMutation.mutateAsync({ bomId, lineItemIds: unchecked });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert("Error", "Failed to checkout items");
    }
  };

  const content = (
    <>
      {/* Header card */}
      <Animated.View entering={FadeInDown.delay(CARD_ENTER_DELAY).springify().damping(15)}>
        <Card>
          <View style={styles.headerRow}>
            <View style={styles.headerText}>
              <Text style={styles.jobName}>{String(b.jobName)}</Text>
              {b.jobNumber ? <Text style={styles.jobNumber}>Job #{String(b.jobNumber)}</Text> : null}
            </View>
            <BomStatusBadge status={status} />
          </View>
          <Text style={styles.meta}>
            {lineItems.length} item{lineItems.length !== 1 ? "s" : ""}
            {b.createdAt ? ` · ${new Date(String(b.createdAt)).toLocaleDateString()}` : ""}
          </Text>
        </Card>
      </Animated.View>

      {/* Line items */}
      <Animated.View entering={FadeInDown.delay(CARD_ENTER_DELAY * 2).springify().damping(15)}>
        <Card style={styles.itemsCard}>
          <Text style={styles.sectionTitle}>Line Items</Text>
          {lineItems.map((li, i) => (
            <BomLineItemRow
              key={String(li.id ?? i)}
              item={{
                id: String(li.id ?? ""),
                bomId,
                productId: li.productId ? String(li.productId) : null,
                productName: String(li.productName ?? ""),
                quantity: Number(li.quantity ?? 0),
                checkedOutQty: Number(li.checkedOutQty ?? 0),
                unit: String(li.unit ?? "EA"),
                isCustom: Boolean(li.isCustom),
              }}
              showCheckout={showCheckout}
            />
          ))}
        </Card>
      </Animated.View>

      {/* Actions */}
      <Animated.View
        entering={FadeInDown.delay(CARD_ENTER_DELAY * 3).springify().damping(15)}
        style={styles.actions}
      >
        {isDraft && (
          <>
            <Button
              title="Submit for Review"
              icon={<Send size={18} color={colors.textInverse} strokeWidth={2} />}
              onPress={handleSubmitReview}
              loading={submitReview.isPending}
            />
            <Button
              title="Delete BOM"
              variant="destructive"
              icon={<Trash2 size={18} color={colors.textInverse} strokeWidth={2} />}
              onPress={handleDelete}
            />
          </>
        )}

        {showCheckout && (
          <Button
            title="Checkout All Items"
            icon={<ShoppingCart size={18} color={colors.textInverse} strokeWidth={2} />}
            onPress={handleCheckoutAll}
            loading={checkoutMutation.isPending}
          />
        )}
      </Animated.View>
    </>
  );

  if (inline) {
    return <View style={[styles.inlineContainer, { padding: screenPadding }]}>{content}</View>;
  }

  return (
    <ScrollView
      style={styles.scrollContainer}
      contentContainerStyle={{ padding: screenPadding, paddingBottom: insets.bottom + 100 }}
    >
      {content}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  inlineContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  headerText: { flex: 1, minWidth: 0 },
  jobName: { ...typography.sectionTitle, color: colors.navy },
  jobNumber: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  meta: { ...typography.caption, color: colors.textMuted, marginTop: spacing.md },
  itemsCard: { marginTop: spacing.lg },
  sectionTitle: { ...typography.cardTitle, color: colors.navy, marginBottom: spacing.sm },
  actions: { marginTop: spacing.lg, gap: spacing.md },
});
