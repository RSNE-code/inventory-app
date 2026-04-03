/**
 * BOM Review Queue — BOMs pending review with approve/reject.
 */
import { useCallback, useState } from "react";
import { StyleSheet, View, Text, FlatList, RefreshControl, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { ClipboardCheck } from "lucide-react-native";
import { Header } from "@/components/layout/Header";
import { IPadPage } from "@/components/layout/iPadPage";
import { BomCard } from "@/components/bom/BomCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingState } from "@/components/shared/LoadingState";
import { useBoms } from "@/hooks/use-boms";
import { useResponsiveSpacing } from "@/lib/hooks/useDeviceType";
import { colors } from "@/constants/colors";
import { spacing, DETAIL_MAX_WIDTH } from "@/constants/layout";
import { STAGGER_DELAY } from "@/constants/animations";
import type { Bom } from "@/types/api";

export default function BomReviewScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [refreshing, setRefreshing] = useState(false);
  const { screenPadding } = useResponsiveSpacing();
  const { data, isLoading, refetch } = useBoms({ status: "PENDING_REVIEW" });
  const boms: Bom[] = (data as any)?.data ?? [];

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  return (
    <>
      <Header title="BOMs for Review" showBack />
      <View style={styles.container}>
        {isLoading ? (
          <LoadingState />
        ) : boms.length === 0 ? (
          <EmptyState
            icon={<ClipboardCheck size={48} color={colors.textMuted} strokeWidth={1.2} />}
            title="No BOMs pending review"
            description="All BOMs have been reviewed"
          />
        ) : (
          <FlatList
            data={boms}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: screenPadding, gap: spacing.md, paddingBottom: insets.bottom + 100 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brandBlue} />}
            renderItem={({ item, index }) => (
              <IPadPage maxWidth={DETAIL_MAX_WIDTH}>
                <Animated.View entering={FadeInDown.delay(index * STAGGER_DELAY).springify().damping(15)}>
                  <BomCard bom={item} onPress={() => router.push(`/boms/${item.id}`)} />
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
});
