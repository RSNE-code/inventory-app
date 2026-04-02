/**
 * ReceiptHistory — list of past receipts with search.
 * Matches web's receipt-history.tsx.
 */
import { useState, useCallback } from "react";
import { StyleSheet, View, Text, FlatList, RefreshControl } from "react-native";
import { Building2, PackageCheck, ChevronRight } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { Card } from "@/components/ui/Card";
import { SearchInput } from "@/components/ui/SearchInput";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingState } from "@/components/shared/LoadingState";
import { useReceiptHistory } from "@/hooks/use-receiving";
import { formatCurrency } from "@/lib/utils";
import { colors } from "@/constants/colors";
import { type as typography } from "@/constants/typography";
import { spacing } from "@/constants/layout";
import type { Receipt } from "@/types/api";

export function ReceiptHistory() {
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const { data, isLoading, refetch } = useReceiptHistory(search || undefined);
  const receipts = (data as { data?: Receipt[] })?.data ?? (Array.isArray(data) ? data : []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  return (
    <View style={styles.container}>
      <SearchInput
        value={search}
        onChangeText={setSearch}
        placeholder="Search by supplier, PO #, or notes\u2026"
      />

      {isLoading ? (
        <LoadingState />
      ) : receipts.length === 0 ? (
        <EmptyState
          icon={<PackageCheck size={48} color={colors.textMuted} strokeWidth={1.2} />}
          title={search ? "No matching receipts" : "No receipts yet"}
          description={search ? "Try a different search" : "Receipts will appear here after receiving"}
        />
      ) : (
        <FlatList
          data={receipts}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Card style={styles.card}>
              <View style={styles.row}>
                <Building2 size={18} color={colors.textMuted} strokeWidth={1.8} />
                <View style={styles.textCol}>
                  <Text style={styles.supplier}>{item.supplierName}</Text>
                  <Text style={styles.meta}>
                    {item._count?.lineItems ?? 0} items · {formatCurrency(item.totalAmount)}
                  </Text>
                </View>
                <ChevronRight size={16} color="rgba(107,127,150,0.3)" strokeWidth={1.5} />
              </View>
            </Card>
          )}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brandBlue} />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.md },
  card: { padding: spacing.md },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  textCol: { flex: 1, minWidth: 0 },
  supplier: { ...typography.subtitle, fontWeight: "600", color: colors.navy },
  meta: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  sep: { height: spacing.sm },
});
