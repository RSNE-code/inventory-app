/**
 * BOMs tab — two tabs: Create BOM + BOM List.
 * Matches web's boms/page.tsx.
 */
import { useState, useCallback } from "react";
import { StyleSheet, View, FlatList, RefreshControl, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { ClipboardList, Camera, Mic, PenLine } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { Header } from "@/components/layout/Header";
import { Tabs } from "@/components/ui/Tabs";
import { SearchInput } from "@/components/ui/SearchInput";
import { Card } from "@/components/ui/Card";
import { BomCard } from "@/components/bom/BomCard";
import { CategoryFilter } from "@/components/inventory/CategoryFilter";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingState } from "@/components/shared/LoadingState";
import { useBoms } from "@/hooks/use-boms";
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
  const [activeTab, setActiveTab] = useState("create");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const { data, isLoading, refetch } = useBoms({ search, status: statusFilter });
  const result = data as { data?: Bom[] } | Bom[] | undefined;
  const boms = Array.isArray(result) ? result : result?.data ?? [];

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  return (
    <>
      <Header title="Bills of Materials" />
      <View style={styles.container}>
        <View style={styles.tabBar}>
          <Tabs tabs={PAGE_TABS} activeKey={activeTab} onTabChange={setActiveTab} />
        </View>

        {activeTab === "create" ? (
          <ScrollView
            style={styles.content}
            contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
          >
            {/* Entry point cards */}
            <Animated.View entering={FadeInDown.springify().damping(15)}>
              <Card
                onPress={() => router.push("/boms/new" as never)}
                style={styles.entryCard}
              >
                <View style={styles.entryRow}>
                  <View style={[styles.entryIcon, { backgroundColor: colors.statusBlueBg }]}>
                    <Camera size={22} color={colors.brandBlue} strokeWidth={1.8} />
                  </View>
                  <View style={styles.entryText}>
                    <Animated.Text style={styles.entryTitle}>Photo / AI Parse</Animated.Text>
                    <Animated.Text style={styles.entrySub}>
                      Snap a packing slip or BOM sheet
                    </Animated.Text>
                  </View>
                </View>
              </Card>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(STAGGER_DELAY).springify().damping(15)}>
              <Card
                onPress={() => router.push("/boms/new" as never)}
                style={styles.entryCard}
              >
                <View style={styles.entryRow}>
                  <View style={[styles.entryIcon, { backgroundColor: "rgba(232, 121, 43, 0.12)" }]}>
                    <PenLine size={22} color={colors.brandOrange} strokeWidth={1.8} />
                  </View>
                  <View style={styles.entryText}>
                    <Animated.Text style={styles.entryTitle}>Manual / Quick Pick</Animated.Text>
                    <Animated.Text style={styles.entrySub}>
                      Search catalog and build a BOM by hand
                    </Animated.Text>
                  </View>
                </View>
              </Card>
            </Animated.View>
          </ScrollView>
        ) : (
          <View style={styles.listContainer}>
            <View style={styles.filters}>
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
                  <Animated.View entering={FadeInDown.delay(index * STAGGER_DELAY).springify().damping(15)}>
                    <BomCard bom={item} onPress={() => router.push(`/boms/${item.id}`)} />
                  </Animated.View>
                )}
                contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: insets.bottom + 100 }}
                refreshControl={
                  <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brandBlue} />
                }
              />
            )}
          </View>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  tabBar: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  content: { flex: 1, padding: spacing.lg },
  listContainer: { flex: 1 },
  filters: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, gap: spacing.sm },
  entryCard: { marginBottom: spacing.md },
  entryRow: { flexDirection: "row", alignItems: "center", gap: spacing.lg },
  entryIcon: {
    width: 48, height: 48, borderRadius: radius.xl,
    alignItems: "center", justifyContent: "center",
  },
  entryText: { flex: 1 },
  entryTitle: { ...typography.cardTitle, color: colors.navy },
  entrySub: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
});
