/**
 * Inventory tab — product list with search, category filter, infinite scroll.
 */
import { useState, useCallback, useMemo } from "react";
import { StyleSheet, View, Text, FlatList, RefreshControl, Pressable, ScrollView } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Package, Plus } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { Header } from "@/components/layout/Header";
import { SearchInput } from "@/components/ui/SearchInput";
import { CategoryFilter } from "@/components/inventory/CategoryFilter";
import { ProductCard } from "@/components/inventory/ProductCard";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { Button } from "@/components/ui/Button";
import { useProducts, useCategories } from "@/hooks/use-products";
import { useIsTablet, useResponsiveSpacing } from "@/lib/hooks/useDeviceType";
import { colors } from "@/constants/colors";
import { type as typography } from "@/constants/typography";
import { spacing } from "@/constants/layout";
import { STAGGER_DELAY } from "@/constants/animations";
import type { Product } from "@/types/api";

export default function InventoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isTablet = useIsTablet();
  const { screenPadding } = useResponsiveSpacing();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [stockFilter, setStockFilter] = useState<"all" | "low" | "out">("all");
  const [refreshing, setRefreshing] = useState(false);
  const numColumns = isTablet ? 2 : 1;

  const { data, isLoading, error, refetch } = useProducts({ search, category });
  const { data: categories } = useCategories();

  const rawProducts: Product[] = (data as any)?.data ?? [];
  const categoryList = (categories as any)?.data ?? [];

  const products = useMemo(() => {
    if (stockFilter === "low") return rawProducts.filter((p) => p.currentQty > 0 && p.currentQty <= p.reorderPoint);
    if (stockFilter === "out") return rawProducts.filter((p) => p.currentQty <= 0);
    return rawProducts;
  }, [rawProducts, stockFilter]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const renderItem = useCallback(
    ({ item, index }: { item: Product; index: number }) => (
      <Animated.View
        entering={FadeInDown.delay(index * STAGGER_DELAY).springify().damping(15)}
        style={isTablet ? styles.gridCell : undefined}
      >
        <ProductCard
          product={item}
          onPress={() => router.push(`/inventory/${item.id}`)}
        />
      </Animated.View>
    ),
    [router, isTablet]
  );

  return (
    <>
      <Header
        title="Inventory"
        action={
          <Button
            title="New"
            variant="ghost"
            size="sm"
            icon={<Plus size={18} color={colors.textInverse} strokeWidth={2} />}
            onPress={() => router.push("/inventory/new" as never)}
          />
        }
      />
      <View style={styles.container}>
        <View style={[styles.filters, { paddingHorizontal: screenPadding }]}>
          <SearchInput
            value={search}
            onChangeText={setSearch}
            placeholder="Search products or SKUs\u2026"
          />
          {categoryList.length > 0 ? (
            <CategoryFilter
              categories={categoryList}
              selected={category}
              onSelect={setCategory}
            />
          ) : null}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stockFilterScroll} style={{ flexGrow: 0 }}>
            {([["all", "All"], ["low", "Low Stock"], ["out", "Out of Stock"]] as const).map(([key, label]) => (
              <Pressable
                key={key}
                style={[styles.stockPill, stockFilter === key && styles.stockPillActive]}
                onPress={() => setStockFilter(key)}
              >
                <Text style={[styles.stockPillText, stockFilter === key && styles.stockPillTextActive]}>{label}</Text>
              </Pressable>
            ))}
          </ScrollView>
          {stockFilter !== "all" ? (
            <View style={styles.filterIndicator}>
              <Text style={styles.filterIndicatorText}>
                Showing: {stockFilter === "low" ? "Low stock" : "Out of stock"}
              </Text>
              <Pressable onPress={() => setStockFilter("all")}>
                <Text style={styles.filterClear}>Clear</Text>
              </Pressable>
            </View>
          ) : null}
          {!isLoading && products.length > 0 ? (
            <Text style={styles.countLabel}>
              {products.length} product{products.length !== 1 ? "s" : ""}
              {search ? ` matching "${search}"` : ""}
              {category ? ` in ${category}` : ""}
            </Text>
          ) : null}
        </View>

        {isLoading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message="Failed to load products" onRetry={() => refetch()} />
        ) : products.length === 0 ? (
          <EmptyState
            icon={<Package size={48} color={colors.textMuted} strokeWidth={1.2} />}
            title={search ? "No results" : "No products yet"}
            description={search ? "Try a different search term" : "Add your first product to get started"}
            actionLabel={search ? undefined : "Add Product"}
            onAction={search ? undefined : () => router.push("/inventory/new" as never)}
          />
        ) : (
          <FlatList
            key={isTablet ? "tablet-2col" : "phone-1col"}
            data={products}
            renderItem={renderItem}
            keyExtractor={(item) => item.id}
            numColumns={numColumns}
            columnWrapperStyle={isTablet ? styles.columnWrapper : undefined}
            contentContainerStyle={[
              styles.list,
              { padding: screenPadding, paddingBottom: insets.bottom + 100 },
            ]}
            ItemSeparatorComponent={() => <View style={styles.separator} />}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.brandBlue}
              />
            }
          />
        )}

        {/* FAB — matches web's fixed bottom-20 right-4 h-14 w-14 rounded-full bg-brand-orange */}
        <Pressable
          style={[styles.fab, { bottom: insets.bottom + 80 }]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push("/inventory/new" as never);
          }}
          accessibilityLabel="Add new product"
          accessibilityRole="button"
        >
          <Plus size={24} color={colors.textInverse} strokeWidth={2.5} />
        </Pressable>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  filters: {
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  list: {
    gap: spacing.md,
  },
  separator: {
    height: spacing.md,
  },
  columnWrapper: {
    gap: spacing.lg,
  },
  gridCell: {
    flex: 1,
  },
  countLabel: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: spacing.xs,
  },
  stockFilterScroll: { gap: spacing.sm, paddingVertical: spacing.xs },
  stockPill: { paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: 9999, backgroundColor: colors.surfaceSecondary, minHeight: 32, justifyContent: "center" },
  stockPillActive: { backgroundColor: colors.navy },
  stockPillText: { ...typography.caption, fontWeight: "600", color: colors.textSecondary },
  stockPillTextActive: { color: colors.textInverse },
  filterIndicator: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: spacing.xs },
  filterIndicatorText: { ...typography.caption, color: colors.textMuted },
  filterClear: { ...typography.caption, fontWeight: "600", color: colors.brandBlue },
  fab: {
    position: "absolute",
    right: 16,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.brandOrange,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#E8792B",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 14,
    elevation: 8,
    zIndex: 50,
  },
});
