/**
 * Dashboard tab — full dashboard with all 6 widgets.
 * Matches web's page.tsx layout: ActionItems → WorkPipelines →
 * StockSummary → LowStock → TrendChart → RecentActivity.
 */
import { useCallback, useState } from "react";
import { StyleSheet, ScrollView, RefreshControl, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Header } from "@/components/layout/Header";
import { ActionItems } from "@/components/dashboard/ActionItems";
import { WorkPipelines } from "@/components/dashboard/WorkPipelines";
import { StockSummaryCard } from "@/components/dashboard/StockSummaryCard";
import { LowStockList } from "@/components/dashboard/LowStockList";
import { InventoryTrendChart } from "@/components/dashboard/InventoryTrendChart";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { Skeleton } from "@/components/ui/Skeleton";
import { useDashboard } from "@/hooks/use-dashboard";
import { useAuth } from "@/lib/auth";
import { useIsTablet, useResponsiveSpacing } from "@/lib/hooks/useDeviceType";
import { getGreeting } from "@/lib/utils";
import { colors } from "@/constants/colors";
import { spacing } from "@/constants/layout";
import { CARD_ENTER_DELAY } from "@/constants/animations";

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { userName } = useAuth();
  const { data: rawDashboard, isLoading, error, refetch } = useDashboard();
  const dashboard = (rawDashboard as any)?.data ?? rawDashboard;
  const [refreshing, setRefreshing] = useState(false);
  const isTablet = useIsTablet();
  const { screenPadding, sectionGap } = useResponsiveSpacing();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  return (
    <>
      <Header title={`${getGreeting()}, ${userName}`} showMenu />
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          { padding: screenPadding, gap: sectionGap, paddingBottom: insets.bottom + 100 },
        ]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.brandBlue}
          />
        }
      >
        {isLoading ? (
          <View style={styles.skeletons}>
            <Skeleton width="100%" height={96} />
            <View style={styles.skeletonRow}>
              <Skeleton width="48%" height={140} />
              <Skeleton width="48%" height={140} />
            </View>
            <Skeleton width="100%" height={96} />
            <Skeleton width="100%" height={180} />
          </View>
        ) : error ? (
          <ErrorState
            message="Failed to load dashboard data"
            onRetry={() => refetch()}
          />
        ) : dashboard ? (
          <>
            {/* 1. Needs Attention — full width */}
            <Animated.View entering={FadeInDown.delay(CARD_ENTER_DELAY).springify().damping(15)}>
              <ActionItems
                bomStatusCounts={dashboard.bomStatusCounts || {}}
                lowStockCount={dashboard.summary.lowStockCount}
                outOfStockCount={dashboard.summary.outOfStockCount}
                pendingApprovals={dashboard.fabrication?.pendingApprovals || 0}
                unfabricatedAssemblyCount={0}
              />
            </Animated.View>

            {/* 2–3. Work Pipelines + Stock Summary — side-by-side on iPad */}
            {isTablet ? (
              <View style={styles.tabletRow}>
                <Animated.View style={styles.tabletHalf} entering={FadeInDown.delay(CARD_ENTER_DELAY * 2).springify().damping(15)}>
                  <WorkPipelines
                    bomStatusCounts={dashboard.bomStatusCounts || {}}
                    fabrication={dashboard.fabrication || { pendingApprovals: 0, inProduction: 0, completed: 0 }}
                    doorQueueCount={0}
                  />
                </Animated.View>
                <Animated.View style={styles.tabletHalf} entering={FadeInDown.delay(CARD_ENTER_DELAY * 3).springify().damping(15)}>
                  <StockSummaryCard summary={dashboard.summary} />
                </Animated.View>
              </View>
            ) : (
              <>
                <Animated.View entering={FadeInDown.delay(CARD_ENTER_DELAY * 2).springify().damping(15)}>
                  <WorkPipelines
                    bomStatusCounts={dashboard.bomStatusCounts || {}}
                    fabrication={dashboard.fabrication || { pendingApprovals: 0, inProduction: 0, completed: 0 }}
                    doorQueueCount={0}
                  />
                </Animated.View>
                <Animated.View entering={FadeInDown.delay(CARD_ENTER_DELAY * 3).springify().damping(15)}>
                  <StockSummaryCard summary={dashboard.summary} />
                </Animated.View>
              </>
            )}

            {/* 4–5. Low Stock + Trend Chart — side-by-side on iPad */}
            {isTablet ? (
              <View style={styles.tabletRow}>
                <Animated.View style={styles.tabletHalf} entering={FadeInDown.delay(CARD_ENTER_DELAY * 4).springify().damping(15)}>
                  <LowStockList items={dashboard.lowStockItems} />
                </Animated.View>
                <Animated.View style={styles.tabletHalf} entering={FadeInDown.delay(CARD_ENTER_DELAY * 5).springify().damping(15)}>
                  <InventoryTrendChart />
                </Animated.View>
              </View>
            ) : (
              <>
                <Animated.View entering={FadeInDown.delay(CARD_ENTER_DELAY * 4).springify().damping(15)}>
                  <LowStockList items={dashboard.lowStockItems} />
                </Animated.View>
                <Animated.View entering={FadeInDown.delay(CARD_ENTER_DELAY * 5).springify().damping(15)}>
                  <InventoryTrendChart />
                </Animated.View>
              </>
            )}

            {/* 6. Recent Activity — full width */}
            <Animated.View entering={FadeInDown.delay(CARD_ENTER_DELAY * 6).springify().damping(15)}>
              <RecentActivity transactions={dashboard.recentTransactions} />
            </Animated.View>
          </>
        ) : null}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    // padding and gap set dynamically via useResponsiveSpacing
  },
  skeletons: {
    gap: spacing.lg,
  },
  skeletonRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  tabletRow: {
    flexDirection: "row",
    gap: spacing.lg,
  },
  tabletHalf: {
    flex: 1,
  },
});
