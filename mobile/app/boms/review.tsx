/**
 * BOM Review Queue — expandable inline review with per-item confirm/fix.
 */
import { useCallback, useState, useMemo } from "react";
import { StyleSheet, View, Text, FlatList, RefreshControl, Pressable, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import {
  ClipboardCheck, ChevronDown, ChevronUp, CheckCircle, XCircle, AlertTriangle,
} from "lucide-react-native";
import { Header } from "@/components/layout/Header";
import { IPadPage } from "@/components/layout/iPadPage";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { BomStatusBadge } from "@/components/bom/BomStatusBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingState } from "@/components/shared/LoadingState";
import { useBoms, useBom, useUpdateBom } from "@/hooks/use-boms";
import { useResponsiveSpacing, useIsTablet } from "@/lib/hooks/useDeviceType";
import { colors } from "@/constants/colors";
import { type as typography } from "@/constants/typography";
import { spacing, radius, DETAIL_MAX_WIDTH, touchTarget } from "@/constants/layout";
import { STAGGER_DELAY } from "@/constants/animations";
import { formatQuantity } from "@/lib/utils";
import type { Bom } from "@/types/api";

export default function BomReviewScreen() {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { screenPadding } = useResponsiveSpacing();
  const { data, isLoading, refetch } = useBoms({ status: "PENDING_REVIEW" });
  const boms: Bom[] = (data as any)?.data ?? [];

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleToggle = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  const renderItem = useCallback(({ item, index }: { item: Bom; index: number }) => (
    <IPadPage maxWidth={DETAIL_MAX_WIDTH}>
      <Animated.View entering={FadeInDown.delay(index * STAGGER_DELAY).springify().damping(15)}>
        <ReviewCard
          bom={item}
          expanded={expandedId === item.id}
          onToggle={() => handleToggle(item.id)}
          onApproved={refetch}
        />
      </Animated.View>
    </IPadPage>
  ), [expandedId, handleToggle, refetch]);

  const keyExtractor = useCallback((item: Bom) => item.id, []);

  return (
    <>
      <Header title="BOMs for Review" showBack />
      <View style={styles.container}>
        {isLoading ? (
          <LoadingState />
        ) : boms.length === 0 ? (
          <EmptyState
            icon={<ClipboardCheck size={48} color={colors.textMuted} strokeWidth={1.2} />}
            title="All caught up"
            description="No BOMs are pending review"
          />
        ) : (
          <FlatList
            data={boms}
            keyExtractor={keyExtractor}
            contentContainerStyle={{ padding: screenPadding, gap: spacing.md, paddingBottom: insets.bottom + 100 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brandBlue} />}
            renderItem={renderItem}
          />
        )}
      </View>
    </>
  );
}

/** Expandable review card with inline line items */
function ReviewCard({ bom, expanded, onToggle, onApproved }: {
  bom: Bom;
  expanded: boolean;
  onToggle: () => void;
  onApproved: () => void;
}) {
  const isTablet = useIsTablet();
  const updateBom = useUpdateBom();
  const { data: detailData } = useBom(expanded ? bom.id : "");
  const [confirmedIds, setConfirmedIds] = useState<Set<string>>(new Set());

  const detail = (detailData as any)?.data ?? detailData;
  const lineItems: Array<Record<string, unknown>> = detail?.lineItems ?? [];
  const minTarget = isTablet ? touchTarget.tablet : touchTarget.phone;

  const allConfirmed = useMemo(
    () => lineItems.length > 0 && lineItems.every((li) => confirmedIds.has(String(li.id))),
    [lineItems, confirmedIds]
  );

  const handleConfirmItem = useCallback((id: string) => {
    setConfirmedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }, []);

  const handleConfirmAll = useCallback(() => {
    const allIds = new Set(lineItems.map((li) => String(li.id)));
    setConfirmedIds(allIds);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, [lineItems]);

  const handleApprove = useCallback(async () => {
    try {
      await updateBom.mutateAsync({ id: bom.id, status: "APPROVED" } as any);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onApproved();
    } catch {
      Alert.alert("Error", "Failed to approve BOM");
    }
  }, [bom.id, updateBom, onApproved]);

  return (
    <Card>
      <Pressable onPress={onToggle}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderText}>
            <Text style={styles.jobName}>{bom.jobName}</Text>
            <Text style={styles.meta}>
              {bom._count?.lineItems ?? 0} items
              {bom.createdAt ? ` · ${new Date(bom.createdAt).toLocaleDateString()}` : ""}
            </Text>
          </View>
          <BomStatusBadge status={bom.status} />
          {expanded ? (
            <ChevronUp size={18} color={colors.textMuted} strokeWidth={1.5} />
          ) : (
            <ChevronDown size={18} color={colors.textMuted} strokeWidth={1.5} />
          )}
        </View>
      </Pressable>

      {expanded ? (
        <Animated.View entering={FadeInDown.springify().damping(20)} style={styles.expandedContent}>
          {/* Confidence summary bar */}
          {lineItems.length > 0 ? (
            <View style={styles.confidenceBar}>
              <View style={[styles.confidenceFill, { flex: confirmedIds.size, backgroundColor: colors.statusGreen }]} />
              <View style={[styles.confidenceFill, { flex: Math.max(0, lineItems.length - confirmedIds.size), backgroundColor: colors.border }]} />
            </View>
          ) : null}
          <Text style={styles.confirmCount}>
            {confirmedIds.size}/{lineItems.length} confirmed
          </Text>

          {/* Line items with confirm/fix */}
          {lineItems.map((li) => {
            const id = String(li.id);
            const isConfirmed = confirmedIds.has(id);
            const confidence = Number(li.matchConfidence ?? 1);
            return (
              <View key={id} style={[styles.lineItem, isConfirmed && styles.lineItemConfirmed]}>
                <View style={styles.lineItemInfo}>
                  <Text style={styles.lineItemName} numberOfLines={1}>
                    {String(li.productName ?? "")}
                  </Text>
                  <Text style={styles.lineItemQty}>
                    {formatQuantity(Number(li.quantity ?? li.qtyNeeded ?? 0))} {String(li.unit ?? "EA")}
                  </Text>
                </View>
                {confidence < 0.8 ? (
                  <AlertTriangle size={14} color={colors.statusYellow} strokeWidth={2} />
                ) : null}
                {isConfirmed ? (
                  <CheckCircle size={20} color={colors.statusGreen} strokeWidth={2} />
                ) : (
                  <Pressable
                    style={[styles.confirmItemBtn, { minWidth: minTarget, minHeight: minTarget }]}
                    onPress={() => handleConfirmItem(id)}
                  >
                    <CheckCircle size={18} color={colors.statusGreen} strokeWidth={2} />
                  </Pressable>
                )}
              </View>
            );
          })}

          {/* Actions */}
          <View style={styles.reviewActions}>
            {!allConfirmed ? (
              <Button
                title="Confirm All"
                variant="secondary"
                onPress={handleConfirmAll}
                size="sm"
              />
            ) : null}
            <Button
              title="Approve BOM"
              icon={<CheckCircle size={16} color={colors.textInverse} strokeWidth={2} />}
              onPress={handleApprove}
              loading={updateBom.isPending}
              disabled={!allConfirmed}
              size="sm"
            />
          </View>
        </Animated.View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  cardHeader: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  cardHeaderText: { flex: 1, minWidth: 0 },
  jobName: { ...typography.cardTitle, color: colors.navy },
  meta: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  expandedContent: {
    marginTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  confidenceBar: {
    flexDirection: "row",
    height: 6,
    borderRadius: radius.full,
    overflow: "hidden",
    backgroundColor: colors.border,
  },
  confidenceFill: {
    height: 6,
  },
  confirmCount: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  lineItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(226,230,235,0.4)",
  },
  lineItemConfirmed: {
    opacity: 0.5,
  },
  lineItemInfo: { flex: 1, minWidth: 0 },
  lineItemName: { ...typography.subtitle, fontWeight: "500", color: colors.navy },
  lineItemQty: { ...typography.caption, color: colors.textMuted, fontVariant: ["tabular-nums"] },
  confirmItemBtn: {
    alignItems: "center",
    justifyContent: "center",
  },
  reviewActions: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.lg,
    justifyContent: "flex-end",
  },
});
