/**
 * Product detail screen — stats, stock badge, actions.
 * Matches web's inventory/[id]/page.tsx.
 */
import { StyleSheet, ScrollView, View, Text, Pressable } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Pencil, ArrowUpDown, MapPin, Clock, Package2, Activity } from "lucide-react-native";
import { Header } from "@/components/layout/Header";
import { IPadPage } from "@/components/layout/iPadPage";
import { Card } from "@/components/ui/Card";
import { StockBadge } from "@/components/inventory/StockBadge";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { Button } from "@/components/ui/Button";
import { Separator } from "@/components/ui/Separator";
import { useProduct } from "@/hooks/use-products";
import { useIsTablet, useResponsiveSpacing } from "@/lib/hooks/useDeviceType";
import { formatCurrency, formatQuantity } from "@/lib/utils";
import { colors } from "@/constants/colors";
import { type as typography } from "@/constants/typography";
import { spacing, radius, DETAIL_MAX_WIDTH } from "@/constants/layout";
import { CARD_ENTER_DELAY } from "@/constants/animations";

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data, isLoading, error, refetch } = useProduct(id!);
  const isTablet = useIsTablet();
  const { screenPadding } = useResponsiveSpacing();

  const product = (data as any)?.data ?? data;

  if (isLoading) {
    return (
      <>
        <Header title="Product Detail" showBack />
        <LoadingState fullScreen />
      </>
    );
  }

  if (error || !product) {
    return (
      <>
        <Header title="Not Found" showBack />
        <ErrorState message="Product not found" onRetry={() => refetch()} />
      </>
    );
  }

  const p = product as Record<string, unknown>;
  const qty = Number(p.currentQty ?? 0);
  const reorder = Number(p.reorderPoint ?? 0);
  const unitCost = Number(p.unitCost ?? 0);

  return (
    <>
      <Header title={String(p.name ?? "Product")} showBack />
      <ScrollView
        style={styles.container}
        contentContainerStyle={{ padding: screenPadding, paddingBottom: insets.bottom + 100 }}
      >
        <IPadPage maxWidth={DETAIL_MAX_WIDTH}>
          {/* Top card: qty + badge */}
          <Animated.View entering={FadeInDown.delay(CARD_ENTER_DELAY).springify().damping(15)}>
            <Card style={styles.topCard}>
              <View style={styles.topRow}>
                <View>
                  <Text style={styles.qtyValue}>{formatQuantity(qty)}</Text>
                  <Text style={styles.qtyUnit}>{String(p.unit ?? "ea")} in stock</Text>
                </View>
                <StockBadge currentQty={qty} reorderPoint={reorder} />
              </View>
              <Separator style={styles.sep} />
              <View style={[styles.statGrid, isTablet && styles.statGridTablet]}>
                <StatItem label="Reorder Point" value={formatQuantity(reorder)} />
                <StatItem label="Unit Cost" value={formatCurrency(unitCost)} />
                <StatItem label="Total Value" value={formatCurrency(qty * unitCost)} />
                <StatItem label="SKU" value={String(p.sku ?? "Not specified")} />
              </View>
            </Card>
          </Animated.View>

          {/* Details + Actions: side-by-side on iPad */}
          {isTablet ? (
            <View style={styles.tabletDetailRow}>
              <Animated.View style={styles.tabletDetailLeft} entering={FadeInDown.delay(CARD_ENTER_DELAY * 2).springify().damping(15)}>
                <Card>
                  <Text style={styles.sectionTitle}>Details</Text>
                  <DetailRow icon={Package2} label="Category" value={String(p.category ?? "Not specified")} />
                  <DetailRow icon={MapPin} label="Location" value={String(p.location ?? "Not specified")} />
                  <DetailRow icon={Clock} label="Tier" value={`Tier ${p.tier ?? 1}`} />
                </Card>
              </Animated.View>
              <Animated.View style={styles.tabletDetailRight} entering={FadeInDown.delay(CARD_ENTER_DELAY * 3).springify().damping(15)}>
                <Card>
                  <Text style={styles.sectionTitle}>Actions</Text>
                  <View style={styles.actions}>
                    <Button
                      title="Adjust Stock"
                      variant="primary"
                      icon={<ArrowUpDown size={18} color={colors.textInverse} strokeWidth={2} />}
                      onPress={() => router.push(`/inventory/${id}/adjust`)}
                    />
                    <Button
                      title="Edit Product"
                      variant="secondary"
                      icon={<Pencil size={18} color={colors.textPrimary} strokeWidth={2} />}
                      onPress={() => router.push(`/inventory/${id}/edit` as never)}
                    />
                  </View>
                </Card>
              </Animated.View>
            </View>
          ) : (
            <>
              <Animated.View entering={FadeInDown.delay(CARD_ENTER_DELAY * 2).springify().damping(15)}>
                <Card style={styles.detailCard}>
                  <Text style={styles.sectionTitle}>Details</Text>
                  <DetailRow icon={Package2} label="Category" value={String(p.category ?? "Not specified")} />
                  <DetailRow icon={MapPin} label="Location" value={String(p.location ?? "Not specified")} />
                  <DetailRow icon={Clock} label="Tier" value={`Tier ${p.tier ?? 1}`} />
                </Card>
              </Animated.View>
              <Animated.View
                entering={FadeInDown.delay(CARD_ENTER_DELAY * 3).springify().damping(15)}
                style={styles.actions}
              >
                <Button
                  title="Adjust Stock"
                  variant="primary"
                  icon={<ArrowUpDown size={18} color={colors.textInverse} strokeWidth={2} />}
                  onPress={() => router.push(`/inventory/${id}/adjust`)}
                />
                <Button
                  title="Edit Product"
                  variant="secondary"
                  icon={<Pencil size={18} color={colors.textPrimary} strokeWidth={2} />}
                  onPress={() => router.push(`/inventory/${id}/edit` as never)}
                />
              </Animated.View>
            </>
          )}
          {/* Recent Activity */}
          <Animated.View entering={FadeInDown.delay(CARD_ENTER_DELAY * 4).springify().damping(15)}>
            <Card style={styles.activityCard}>
              <View style={styles.activityHeader}>
                <Activity size={18} color={colors.brandBlue} strokeWidth={2} />
                <Text style={styles.sectionTitle}>Recent Activity</Text>
              </View>
              {p.createdAt ? (
                <View style={styles.activityRow}>
                  <Text style={styles.activityType}>Created</Text>
                  <Text style={styles.activityDate}>{new Date(String(p.createdAt)).toLocaleDateString()}</Text>
                </View>
              ) : null}
              {p.updatedAt && p.updatedAt !== p.createdAt ? (
                <View style={styles.activityRow}>
                  <Text style={styles.activityType}>Last Updated</Text>
                  <Text style={styles.activityDate}>{new Date(String(p.updatedAt)).toLocaleDateString()}</Text>
                </View>
              ) : null}
            </Card>
          </Animated.View>
        </IPadPage>
      </ScrollView>
    </>
  );
}

function StatItem({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function DetailRow({ icon: Icon, label, value }: { icon: typeof MapPin; label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Icon size={16} color={colors.textMuted} strokeWidth={1.8} />
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  topCard: {
    marginBottom: spacing.lg,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  qtyValue: {
    ...typography.displayLarge,
    color: colors.navy,
    fontVariant: ["tabular-nums"],
  },
  qtyUnit: {
    ...typography.body,
    color: colors.textMuted,
    marginTop: 2,
  },
  sep: {
    marginVertical: spacing.lg,
  },
  statGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.lg,
  },
  statGridTablet: {
    flexWrap: "nowrap",
  },
  statItem: {
    width: "45%",
  },
  statLabel: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: "500",
  },
  statValue: {
    ...typography.subtitle,
    fontWeight: "600",
    color: colors.navy,
    marginTop: 2,
    fontVariant: ["tabular-nums"],
  },
  detailCard: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.cardTitle,
    color: colors.navy,
    marginBottom: spacing.md,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  detailLabel: {
    ...typography.body,
    color: colors.textMuted,
    width: 80,
  },
  detailValue: {
    ...typography.body,
    fontWeight: "500",
    color: colors.textPrimary,
    flex: 1,
  },
  actions: {
    gap: spacing.md,
  },
  tabletDetailRow: {
    flexDirection: "row",
    gap: spacing.lg,
  },
  tabletDetailLeft: {
    flex: 1,
  },
  tabletDetailRight: {
    flex: 1,
  },
  activityCard: {
    marginTop: spacing.lg,
  },
  activityHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  activityRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  activityType: {
    ...typography.body,
    color: colors.textMuted,
  },
  activityDate: {
    ...typography.body,
    fontWeight: "500",
    color: colors.navy,
  },
});
