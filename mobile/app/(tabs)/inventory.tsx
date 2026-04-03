/**
 * Inventory tab — product list with search, category filter, infinite scroll.
 */
import { useState, useCallback } from "react";
import { StyleSheet, View, Text, FlatList, RefreshControl, Pressable } from "react-native";
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
  const [refreshing, setRefreshing] = useState(false);
  const numColumns = isTablet ? 2 : 1;

  const { data, isLoading, error, refetch } = useProducts({ search, category });
  const { data: categories } = useCategories();

  const products: Product[] = (data as any)?.data ?? [];
  const categoryList = (categories as any)?.data ?? [];

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
});
