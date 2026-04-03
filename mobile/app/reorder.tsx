/**
 * Reorder list — items below reorder point.
 */
import { useCallback, useState } from "react";
import { StyleSheet, View, Text, FlatList, RefreshControl } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { ShoppingCart } from "lucide-react-native";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { IPadPage } from "@/components/layout/iPadPage";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingState } from "@/components/shared/LoadingState";
import { apiGet } from "@/lib/api";
import { queryKeys } from "@/lib/query-keys";
import { useResponsiveSpacing } from "@/lib/hooks/useDeviceType";
import { formatQuantity } from "@/lib/utils";
import { colors } from "@/constants/colors";
import { type as typography } from "@/constants/typography";
import { spacing, DETAIL_MAX_WIDTH } from "@/constants/layout";
import { STAGGER_DELAY } from "@/constants/animations";

interface ReorderItem {
  id: string;
  name: string;
  currentQty: number;
  reorderPoint: number;
  unit: string;
  suggestedQty: number;
}

export default function ReorderScreen() {
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const { screenPadding } = useResponsiveSpacing();
  const { data, isLoading, refetch } = useQuery({
    queryKey: queryKeys.reorderList,
    queryFn: () => apiGet<ReorderItem[]>("/api/reorder-list"),
  });

  const items: ReorderItem[] = (data as any)?.data ?? [];

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  return (
    <>
      <Header title="Reorder List" showBack />
      <View style={styles.container}>
        {isLoading ? (
          <LoadingState />
        ) : items.length === 0 ? (
          <EmptyState
            icon={<ShoppingCart size={48} color={colors.textMuted} strokeWidth={1.2} />}
            title="No items to reorder"
            description="All stock levels are above reorder points"
          />
        ) : (
          <FlatList
            data={items}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: screenPadding, gap: spacing.md, paddingBottom: insets.bottom + 100 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brandBlue} />}
            renderItem={({ item, index }) => (
              <IPadPage maxWidth={DETAIL_MAX_WIDTH}>
              <Animated.View entering={FadeInDown.delay(index * STAGGER_DELAY).springify().damping(15)}>
                <Card accent="yellow">
                  <Text style={styles.itemName}>{item.name}</Text>
                  <View style={styles.row}>
                    <View>
                      <Text style={styles.label}>Current</Text>
                      <Text style={styles.value}>{formatQuantity(item.currentQty)} {item.unit}</Text>
                    </View>
                    <View>
                      <Text style={styles.label}>Reorder At</Text>
                      <Text style={styles.value}>{formatQuantity(item.reorderPoint)}</Text>
                    </View>
                    <View>
                      <Text style={styles.label}>Suggested</Text>
                      <Text style={styles.valueBold}>{formatQuantity(item.suggestedQty)} {item.unit}</Text>
                    </View>
                  </View>
                </Card>
              </Animated.View>
              </IPadPage>
            )}
          />
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  itemName: { ...typography.cardTitle, color: colors.navy, marginBottom: spacing.sm },
  row: { flexDirection: "row", justifyContent: "space-between" },
  label: { ...typography.caption, color: colors.textMuted },
  value: { ...typography.subtitle, color: colors.navy, fontVariant: ["tabular-nums"], marginTop: 2 },
  valueBold: { ...typography.subtitle, fontWeight: "700", color: colors.brandOrange, fontVariant: ["tabular-nums"], marginTop: 2 },
});
