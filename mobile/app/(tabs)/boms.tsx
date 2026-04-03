/**
 * BOMs tab — two tabs: Create BOM + BOM List.
 * iPad: SplitView master-detail on the list tab.
 * Matches web's boms/page.tsx.
 */
import { useState, useCallback } from "react";
import { StyleSheet, View, Text, FlatList, RefreshControl, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { ClipboardList, Camera, ShoppingCart } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { Header } from "@/components/layout/Header";
import { Tabs } from "@/components/ui/Tabs";
import { SearchInput } from "@/components/ui/SearchInput";
import { Card } from "@/components/ui/Card";
import { BomCard } from "@/components/bom/BomCard";
import { BomDetailContent } from "@/components/bom/BomDetailContent";
import { SplitView } from "@/components/layout/SplitView";
import { CategoryFilter } from "@/components/inventory/CategoryFilter";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingState } from "@/components/shared/LoadingState";
import { useBoms } from "@/hooks/use-boms";
import { useIsTablet, useResponsiveSpacing } from "@/lib/hooks/useDeviceType";
import { colors } from "@/constants/colors";
import { type as typography } from "@/constants/typography";
import { spacing, radius } from "@/constants/layout";
import { STAGGER_DELAY } from "@/constants/animations";
import type { Bom } from "@/types/api";

const PAGE_TABS = [
  { key: "create", label: "Create BOM" },
  { key: "list", label: "BOM List" },
];

const STATUS_FILTERS = [
  { id: "", name: "All" },
  { id: "DRAFT", name: "Draft" },
  { id: "PENDING_REVIEW", name: "Review" },
  { id: "APPROVED", name: "Approved" },
  { id: "IN_PROGRESS", name: "In Progress" },
  { id: "COMPLETED", name: "Completed" },
];

export default function BomsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isTablet = useIsTablet();
  const { screenPadding } = useResponsiveSpacing();
  const [activeTab, setActiveTab] = useState("create");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [selectedBomId, setSelectedBomId] = useState<string | null>(null);

  const { data, isLoading, refetch } = useBoms({ search, status: statusFilter });
  const boms: Bom[] = (data as any)?.data ?? [];

  // Auto-select first BOM on iPad when list loads
  if (isTablet && boms.length > 0 && !selectedBomId) {
    setSelectedBomId(boms[0].id);
  }

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleBomPress = useCallback((bom: Bom) => {
    if (isTablet) {
      setSelectedBomId(bom.id);
    } else {
      router.push(`/boms/${bom.id}`);
    }
  }, [isTablet, router]);

  /** Master panel: BOM list with filters */
  const masterContent = (
    <View style={styles.listContainer}>
      <View style={[styles.filters, { paddingHorizontal: isTablet ? spacing.lg : screenPadding }]}>
        <SearchInput value={search} onChangeText={setSearch} placeholder="Search BOMs\u2026" />
        <CategoryFilter
          categories={STATUS_FILTERS}
          selected={statusFilter}
          onSelect={setStatusFilter}
        />
      </View>

      {isLoading ? (
        <LoadingState />
      ) : boms.length === 0 ? (
        <EmptyState
          icon={<ClipboardList size={48} color={colors.textMuted} strokeWidth={1.2} />}
          title={search ? "No matching BOMs" : "No BOMs yet"}
          description={search ? "Try a different search" : "Create your first BOM to get started"}
        />
      ) : (
        <FlatList
          data={boms}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <Animated.View entering={FadeInDown.delay(index * STAGGER_DELAY).springify().damping(20)}>
              <BomCard bom={item} onPress={() => handleBomPress(item)} isSelected={isTablet && item.id === selectedBomId} />
            </Animated.View>
          )}
          contentContainerStyle={{
            padding: isTablet ? spacing.lg : screenPadding,
            gap: spacing.md,
            paddingBottom: insets.bottom + 100,
          }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brandBlue} />
          }
        />
      )}
    </View>
  );

  /** Detail panel: selected BOM or empty state */
  const detailContent = selectedBomId ? (
    <ScrollView
      style={styles.detailScroll}
      contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
    >
      <BomDetailContent
        bomId={selectedBomId}
        inline
        onDeleted={() => setSelectedBomId(null)}
      />
    </ScrollView>
  ) : (
    <EmptyState
      icon={<ClipboardList size={48} color={colors.textMuted} strokeWidth={1.2} />}
      title="Select a BOM"
      description="Tap a BOM from the list to view details"
    />
  );

  return (
    <>
      <Header title="Bills of Materials" />
      <View style={styles.container}>
        <View style={[styles.tabBar, { paddingHorizontal: screenPadding }]}>
          <Tabs tabs={PAGE_TABS} activeKey={activeTab} onTabChange={setActiveTab} />
        </View>

        {activeTab === "create" ? (
          <ScrollView
            style={styles.content}
            contentContainerStyle={{ padding: screenPadding, paddingBottom: insets.bottom + 100 }}
          >
            {/* Prominent entry cards — side-by-side on iPad */}
            <View style={isTablet ? styles.entryRow : styles.entryCol}>
              <Animated.View style={isTablet ? styles.entryHalf : undefined} entering={FadeInDown.springify().damping(20)}>
                <Card
                  onPress={() => router.push("/boms/new?mode=photo" as never)}
                  style={styles.entryCardProminent}
                >
                  <View style={styles.entryIconLarge}>
                    <Camera size={32} color={colors.textInverse} strokeWidth={1.8} />
                  </View>
                  <Text style={styles.entryTitleLarge}>Packing Slip</Text>
                  <Text style={styles.entrySubLarge}>
                    Snap a photo of your packing slip or BOM sheet
                  </Text>
                  <View style={styles.entryAccentOrange} />
                </Card>
              </Animated.View>

              <Animated.View style={isTablet ? styles.entryHalf : undefined} entering={FadeInDown.delay(STAGGER_DELAY).springify().damping(20)}>
                <Card
                  onPress={() => router.push("/boms/new?mode=manual" as never)}
                  style={styles.entryCardSecondary}
                >
                  <View style={styles.entryIconLargeBlue}>
                    <ShoppingCart size={32} color={colors.textInverse} strokeWidth={1.8} />
                  </View>
                  <Text style={styles.entryTitleLarge}>Browse Products</Text>
                  <Text style={styles.entrySubLarge}>
                    Search the catalog and build a BOM by hand
                  </Text>
                  <View style={styles.entryAccentBlue} />
                </Card>
              </Animated.View>
            </View>
          </ScrollView>
        ) : isTablet ? (
          <SplitView master={masterContent} detail={detailContent} />
        ) : (
          masterContent
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  tabBar: { paddingTop: spacing.md },
  content: { flex: 1 },
  listContainer: { flex: 1 },
  filters: { paddingTop: spacing.md, gap: spacing.sm },
  detailScroll: { flex: 1, backgroundColor: colors.background },
  entryRow: { flexDirection: "row", gap: spacing.lg },
  entryCol: { gap: spacing.lg },
  entryHalf: { flex: 1 },
  entryCardProminent: {
    alignItems: "center",
    paddingVertical: spacing["3xl"],
    borderLeftWidth: 4,
    borderLeftColor: colors.brandOrange,
    minHeight: 160,
  },
  entryCardSecondary: {
    alignItems: "center",
    paddingVertical: spacing["3xl"],
    borderLeftWidth: 4,
    borderLeftColor: colors.brandBlue,
    minHeight: 160,
  },
  entryIconLarge: {
    width: 64, height: 64, borderRadius: radius["2xl"],
    backgroundColor: colors.brandOrange,
    alignItems: "center", justifyContent: "center",
    marginBottom: spacing.lg,
  },
  entryIconLargeBlue: {
    width: 64, height: 64, borderRadius: radius["2xl"],
    backgroundColor: colors.brandBlue,
    alignItems: "center", justifyContent: "center",
    marginBottom: spacing.lg,
  },
  entryTitleLarge: {
    ...typography.sectionTitle,
    color: colors.navy,
    marginBottom: spacing.xs,
  },
  entrySubLarge: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: "center",
    paddingHorizontal: spacing.lg,
  },
  entryAccentOrange: {
    width: 40, height: 3, borderRadius: 2,
    backgroundColor: colors.brandOrange,
    marginTop: spacing.lg,
  },
  entryAccentBlue: {
    width: 40, height: 3, borderRadius: 2,
    backgroundColor: colors.brandBlue,
    marginTop: spacing.lg,
  },
});
