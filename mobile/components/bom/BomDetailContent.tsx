/**
 * BomDetailContent — reusable BOM detail view.
 * Used both in the [id] route (standalone) and in the BOMs tab SplitView (inline).
 */
import { useState, useMemo, useCallback } from "react";
import { StyleSheet, ScrollView, View, Text, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Send, CheckCircle, Trash2, ShoppingCart, Pencil, Plus, Undo2, XCircle } from "lucide-react-native";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { BomStatusBadge } from "@/components/bom/BomStatusBadge";
import { BomLineItemRow } from "@/components/bom/BomLineItemRow";
import { BomModeBar } from "@/components/bom/BomModeBar";
import { PickCheckoutSection } from "@/components/bom/PickCheckoutSection";
import { FabGateSection } from "@/components/bom/FabGateSection";
import { PanelCheckoutSheet } from "@/components/bom/PanelCheckoutSheet";
import { SwipeableRow } from "@/components/ui/SwipeableRow";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { EmptyState } from "@/components/shared/EmptyState";
import { useBom, useSubmitForReview, useUpdateBom, useDeleteBom, useCheckoutBom } from "@/hooks/use-boms";
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
  const updateBom = useUpdateBom();
  const deleteBom = useDeleteBom();
  const checkoutMutation = useCheckoutBom();
  const [panelCheckoutItem, setPanelCheckoutItem] = useState<{ name: string; id: string } | null>(null);
  const [mode, setMode] = useState<"view" | "edit" | "add-material" | "return">("view");

  const handleExitMode = useCallback(() => setMode("view"), []);

  const bom = (data as any)?.data ?? data;

  if (isLoading) return <LoadingState />;

  if (error || !bom) {
    return <ErrorState message="BOM not found" onRetry={() => refetch()} />;
  }

  const b = bom as Record<string, unknown>;
  const status = String(b.status ?? "DRAFT");
  const lineItems = (b.lineItems as Array<Record<string, unknown>>) ?? [];
  const isDraft = status === "DRAFT";
  const isPendingReview = status === "PENDING_REVIEW";
  const isApproved = status === "APPROVED";
  const isInProgress = status === "IN_PROGRESS";
  const showCheckout = isApproved || isInProgress;

  // Fab gate: compute unfabricated assembly items from line item data
  const fabGateData = useMemo(() => {
    const ASSEMBLY_CATEGORIES = ["DOOR", "PANEL", "FLOOR", "RAMP"];
    const assemblyItems = lineItems.filter((li) => {
      const product = li.product as Record<string, unknown> | undefined;
      const category = String(product?.category ?? "").toUpperCase();
      return ASSEMBLY_CATEGORIES.includes(category);
    });
    // If the BOM response includes unfabricated data, prefer it
    const serverCount = Number((b as any).unfabricatedCount ?? -1);
    return {
      unfabricatedCount: serverCount >= 0 ? serverCount : assemblyItems.length,
      assemblyNames: assemblyItems.map((li) => String(li.productName ?? "")),
    };
  }, [lineItems, b]);

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

  const handlePanelCheckout = useCallback((length: number, width: number, qty: number) => {
    if (!panelCheckoutItem) return;
    checkoutMutation.mutate(
      { bomId, lineItemIds: [panelCheckoutItem.id] },
      {
        onSuccess: () => {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setPanelCheckoutItem(null);
        },
        onError: () => Alert.alert("Error", "Failed to checkout panel"),
      }
    );
  }, [panelCheckoutItem, bomId, checkoutMutation]);

  const handleApproveBom = useCallback(async () => {
    if (fabGateData.unfabricatedCount > 0) {
      Alert.alert("Fabrication Required", "All assembly items must have fab orders before approval.");
      return;
    }
    try {
      await updateBom.mutateAsync({ id: bomId, status: "APPROVED" } as any);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert("Error", "Failed to approve BOM");
    }
  }, [bomId, fabGateData.unfabricatedCount, updateBom]);

  const handleCancelBom = useCallback(() => {
    Alert.alert("Cancel BOM", "Are you sure you want to cancel this BOM?", [
      { text: "No", style: "cancel" },
      {
        text: "Cancel BOM",
        style: "destructive",
        onPress: async () => {
          try {
            await updateBom.mutateAsync({ id: bomId, status: "CANCELLED" } as any);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch {
            Alert.alert("Error", "Failed to cancel BOM");
          }
        },
      },
    ]);
  }, [bomId, updateBom]);

  const handleCompleteBom = useCallback(async () => {
    try {
      await updateBom.mutateAsync({ id: bomId, status: "COMPLETED" } as any);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert("Error", "Failed to complete BOM");
    }
  }, [bomId, updateBom]);

  const handlePickCheckout = useCallback((selections: { id: string; qty: number }[]) => {
    const ids = selections.map((s) => s.id);
    checkoutMutation.mutate(
      { bomId, lineItemIds: ids },
      {
        onSuccess: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success),
        onError: () => Alert.alert("Error", "Failed to checkout items"),
      }
    );
  }, [bomId, checkoutMutation]);

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

  const checkoutLineItems = useMemo(
    () => lineItems.map((li) => ({
      id: String(li.id ?? ""),
      productName: String(li.productName ?? ""),
      quantity: Number(li.quantity ?? 0),
      checkedOutQty: Number(li.checkedOutQty ?? 0),
      unit: String(li.unit ?? "EA"),
    })),
    [lineItems]
  );

  const content = (
    <>
      {/* Mode bar */}
      {mode !== "view" ? <BomModeBar mode={mode} onExit={handleExitMode} /> : null}

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
          {lineItems.map((li, i) => {
            const row = (
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
            );
            return mode === "edit" ? (
              <SwipeableRow key={String(li.id ?? i)} onDelete={() => {/* TODO: wire delete mutation */}}>
                {row}
              </SwipeableRow>
            ) : row;
          })}
        </Card>
      </Animated.View>

      {/* Fab gate — blocks approval when assembly items need fabrication */}
      {(isDraft || isPendingReview) && fabGateData.unfabricatedCount > 0 ? (
        <Animated.View entering={FadeInDown.delay(CARD_ENTER_DELAY * 2.5).springify().damping(15)}>
          <FabGateSection
            unfabricatedCount={fabGateData.unfabricatedCount}
            assemblyNames={fabGateData.assemblyNames}
          />
        </Animated.View>
      ) : null}

      {/* Per-item checkout */}
      {showCheckout && mode === "view" ? (
        <PickCheckoutSection
          lineItems={checkoutLineItems}
          onCheckout={handlePickCheckout}
          loading={checkoutMutation.isPending}
        />
      ) : null}

      {/* Actions */}
      <Animated.View
        entering={FadeInDown.delay(CARD_ENTER_DELAY * 3).springify().damping(15)}
        style={styles.actions}
      >
        {/* Draft actions */}
        {isDraft ? (
          <>
            <Button
              title="Edit Draft"
              icon={<Pencil size={18} color={colors.textInverse} strokeWidth={2} />}
              onPress={() => setMode("edit")}
              variant="secondary"
            />
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
        ) : null}

        {/* Pending review actions */}
        {isPendingReview ? (
          <>
            <Button
              title="Approve BOM"
              icon={<CheckCircle size={18} color={colors.textInverse} strokeWidth={2} />}
              onPress={handleApproveBom}
              loading={updateBom.isPending}
              disabled={fabGateData.unfabricatedCount > 0}
            />
            <Button
              title="Cancel BOM"
              variant="destructive"
              icon={<XCircle size={18} color={colors.textInverse} strokeWidth={2} />}
              onPress={handleCancelBom}
            />
          </>
        ) : null}

        {/* Approved/In-Progress actions */}
        {showCheckout && mode === "view" ? (
          <>
            <Button
              title="Add Material"
              icon={<Plus size={18} color={colors.textInverse} strokeWidth={2} />}
              onPress={() => setMode("add-material")}
              variant="secondary"
            />
            <Button
              title="Return Material"
              icon={<Undo2 size={18} color={colors.textInverse} strokeWidth={2} />}
              onPress={() => setMode("return")}
              variant="secondary"
            />
          </>
        ) : null}

        {/* In-Progress completion */}
        {isInProgress && mode === "view" ? (
          <Button
            title="Mark as Complete"
            icon={<CheckCircle size={18} color={colors.textInverse} strokeWidth={2} />}
            onPress={handleCompleteBom}
            loading={updateBom.isPending}
          />
        ) : null}
      </Animated.View>
    </>
  );

  const panelSheet = (
    <PanelCheckoutSheet
      visible={panelCheckoutItem !== null}
      onClose={() => setPanelCheckoutItem(null)}
      productName={panelCheckoutItem?.name ?? ""}
      onCheckout={handlePanelCheckout}
      loading={checkoutMutation.isPending}
    />
  );

  if (inline) {
    return (
      <View style={[styles.inlineContainer, { padding: screenPadding }]}>
        {content}
        {panelSheet}
      </View>
    );
  }

  return (
    <>
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={{ padding: screenPadding, paddingBottom: insets.bottom + 100 }}
      >
        {content}
      </ScrollView>
      {panelSheet}
    </>
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
