/**
 * BOM Templates list screen.
 */
import { useState, useCallback } from "react";
import { StyleSheet, View, FlatList, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { FileText, Plus } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { SearchInput } from "@/components/ui/SearchInput";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingState } from "@/components/shared/LoadingState";
import { useBomTemplates } from "@/hooks/use-bom-templates";
import { useIsTablet, useResponsiveSpacing } from "@/lib/hooks/useDeviceType";
import { colors } from "@/constants/colors";
import { type as typography } from "@/constants/typography";
import { spacing } from "@/constants/layout";
import { STAGGER_DELAY } from "@/constants/animations";
import { Text } from "react-native";

export default function BomTemplatesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isTablet = useIsTablet();
  const { screenPadding } = useResponsiveSpacing();
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const numColumns = isTablet ? 2 : 1;
  const { data, isLoading, refetch } = useBomTemplates({ search });
  const templates = (data as any)?.data ?? [];

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  return (
    <>
      <Header title="BOM Templates" showBack action={
        <Button title="New" variant="ghost" size="sm" icon={<Plus size={18} color={colors.textInverse} strokeWidth={2} />}
          onPress={() => router.push("/bom-templates/new" as never)} />
      } />
      <View style={styles.container}>
        <View style={[styles.searchWrap, { paddingHorizontal: screenPadding }]}>
          <SearchInput value={search} onChangeText={setSearch} placeholder="Search templates\u2026" />
        </View>
        {isLoading ? <LoadingState /> : templates.length === 0 ? (
          <EmptyState icon={<FileText size={48} color={colors.textMuted} strokeWidth={1.2} />} title="No templates" description="Create a template to reuse BOM structures" actionLabel="Create Template" onAction={() => router.push("/bom-templates/new" as never)} />
        ) : (
          <FlatList data={templates} keyExtractor={(item: any) => item.id}
            key={isTablet ? "tablet-2col" : "phone-1col"}
            numColumns={numColumns}
            columnWrapperStyle={isTablet ? styles.columnWrapper : undefined}
            contentContainerStyle={{ padding: screenPadding, gap: spacing.md, paddingBottom: insets.bottom + 100 }}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brandBlue} />}
            renderItem={({ item, index }: { item: any; index: number }) => (
              <Animated.View entering={FadeInDown.delay(index * STAGGER_DELAY).springify().damping(15)} style={isTablet ? styles.gridCell : undefined}>
                <Card onPress={() => router.push(`/bom-templates/${item.id}` as never)}>
                  <Text style={styles.name}>{item.name}</Text>
                  {item.description ? <Text style={styles.desc}>{item.description}</Text> : null}
                  <Text style={styles.meta}>{item.lineItems?.length ?? 0} items</Text>
                </Card>
              </Animated.View>
            )} />
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  searchWrap: { paddingTop: spacing.md },
  columnWrapper: { gap: spacing.lg },
  gridCell: { flex: 1 },
  name: { ...typography.cardTitle, color: colors.navy },
  desc: { ...typography.body, color: colors.textMuted, marginTop: 2 },
  meta: { ...typography.caption, color: colors.textMuted, marginTop: spacing.sm },
});
