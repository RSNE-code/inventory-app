/**
 * ReceiptHistory — list of past receipts with search.
 * Matches web's receipt-history.tsx.
 */
import { useState, useCallback } from "react";
import { StyleSheet, View, Text, FlatList, RefreshControl, Pressable, Alert } from "react-native";
import { Building2, PackageCheck, ChevronDown, ChevronUp } from "lucide-react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { SearchInput } from "@/components/ui/SearchInput";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingState } from "@/components/shared/LoadingState";
import { useReceiptHistory } from "@/hooks/use-receiving";
import { formatCurrency } from "@/lib/utils";
import { colors } from "@/constants/colors";
import { type as typography } from "@/constants/typography";
import { spacing, radius } from "@/constants/layout";
import type { Receipt } from "@/types/api";

export function ReceiptHistory() {
  const [search, setSearch] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { data, isLoading, refetch } = useReceiptHistory(search || undefined);
  const receipts: Receipt[] = (data as any)?.data ?? [];

  const handleToggleExpand = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

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
          renderItem={({ item }) => {
            const isExpanded = expandedId === item.id;
            const lineItems = (item as any).lineItems ?? [];
            const isVoided = (item as any).status === "VOIDED";
            return (
              <Pressable onPress={() => handleToggleExpand(item.id)}>
                <Card style={styles.card}>
                  <View style={styles.row}>
                    <Building2 size={18} color={colors.textMuted} strokeWidth={1.8} />
                    <View style={styles.textCol}>
                      <View style={styles.supplierRow}>
                        <Text style={styles.supplier}>{item.supplierName}</Text>
                        {isVoided ? <Badge label="Voided" variant="red" /> : null}
                      </View>
                      <Text style={styles.meta}>
                        {item._count?.lineItems ?? 0} items · {formatCurrency(item.totalAmount)}
                        {item.createdAt ? ` · ${new Date(item.createdAt).toLocaleDateString()}` : ""}
                      </Text>
                    </View>
                    {isExpanded ? (
                      <ChevronUp size={16} color={colors.textMuted} strokeWidth={1.5} />
                    ) : (
                      <ChevronDown size={16} color={colors.textMuted} strokeWidth={1.5} />
                    )}
                  </View>
                  {isExpanded ? (
                    <Animated.View entering={FadeInDown.springify().damping(20)} style={styles.expandedContent}>
                      {item.notes ? (
                        <Text style={styles.notes}>{item.notes}</Text>
                      ) : null}
                      {lineItems.length > 0 ? (
                        lineItems.map((li: any, i: number) => (
                          <View key={li.id ?? i} style={styles.lineItem}>
                            <Text style={styles.lineItemName} numberOfLines={1}>{li.productName}</Text>
                            <Text style={styles.lineItemQty}>{li.quantity} {li.unit}</Text>
                            <Text style={styles.lineItemCost}>{formatCurrency(li.unitCost)}</Text>
                          </View>
                        ))
                      ) : (
                        <Text style={styles.noItems}>No line item details available</Text>
                      )}
                    </Animated.View>
                  ) : null}
                </Card>
              </Pressable>
            );
          }}
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
  supplierRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  expandedContent: { marginTop: spacing.md, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border, paddingTop: spacing.md },
  notes: { ...typography.body, color: colors.textMuted, fontStyle: "italic", marginBottom: spacing.sm },
  lineItem: { flexDirection: "row", alignItems: "center", paddingVertical: spacing.xs, gap: spacing.sm },
  lineItemName: { ...typography.body, color: colors.navy, flex: 1, minWidth: 0 },
  lineItemQty: { ...typography.caption, color: colors.textMuted, fontVariant: ["tabular-nums"] },
  lineItemCost: { ...typography.caption, color: colors.textMuted, fontVariant: ["tabular-nums"] },
  noItems: { ...typography.caption, color: colors.textMuted },
});
