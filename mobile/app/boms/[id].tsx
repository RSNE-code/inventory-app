/**
 * BOM detail screen — line items, status actions, checkout.
 */
import { StyleSheet, ScrollView, View, Text, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { ClipboardList, Send, CheckCircle, Trash2, ShoppingCart } from "lucide-react-native";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { BomStatusBadge } from "@/components/bom/BomStatusBadge";
import { BomLineItemRow } from "@/components/bom/BomLineItemRow";
import { Separator } from "@/components/ui/Separator";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { useBom, useSubmitForReview, useDeleteBom, useCheckoutBom } from "@/hooks/use-boms";
import { colors } from "@/constants/colors";
import { type as typography } from "@/constants/typography";
import { spacing, radius } from "@/constants/layout";
import { CARD_ENTER_DELAY } from "@/constants/animations";

export default function BomDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data, isLoading, error, refetch } = useBom(id!);
  const submitReview = useSubmitForReview();
  const deleteBom = useDeleteBom();
  const checkoutMutation = useCheckoutBom();

  const bom = (data as any)?.data ?? data;

  if (isLoading) {
    return (
      <>
        <Header title="BOM Detail" showBack />
        <LoadingState fullScreen />
      </>
    );
  }

  if (error || !bom) {
    return (
      <>
        <Header title="Not Found" showBack />
        <ErrorState message="BOM not found" onRetry={() => refetch()} />
      </>
    );
  }

  const b = bom as Record<string, unknown>;
  const status = String(b.status ?? "DRAFT");
  const lineItems = (b.lineItems as Array<Record<string, unknown>>) ?? [];
  const isDraft = status === "DRAFT";
  const isPending = status === "PENDING_REVIEW";
  const isApproved = status === "APPROVED";
  const isInProgress = status === "IN_PROGRESS";
  const showCheckout = isApproved || isInProgress;

  const handleSubmitReview = async () => {
    try {
      await submitReview.mutateAsync(id!);
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
            await deleteBom.mutateAsync(id!);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.back();
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
      await checkoutMutation.mutateAsync({ bomId: id!, lineItemIds: unchecked });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert("Error", "Failed to checkout items");
    }
  };

  return (
    <>
      <Header title={String(b.jobName ?? "BOM")} showBack />
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
      >
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
                  bomId: id!,
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
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
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
