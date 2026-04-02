/**
 * ProductPicker — search and select products modal.
 */
import { useState, useMemo } from "react";
import { StyleSheet, View, Text, FlatList, Pressable } from "react-native";
import { Package, Check } from "lucide-react-native";
import { Sheet } from "@/components/ui/Sheet";
import { SearchInput } from "@/components/ui/SearchInput";
import { Badge } from "@/components/ui/Badge";
import { useProducts } from "@/hooks/use-products";
import { formatQuantity, getStockStatus } from "@/lib/utils";
import { colors } from "@/constants/colors";
import { type as typography } from "@/constants/typography";
import { spacing, radius } from "@/constants/layout";
import type { Product } from "@/types/api";

interface ProductPickerProps {
  visible: boolean;
  onClose: () => void;
  onSelect: (product: Product) => void;
  excludeIds?: string[];
}

export function ProductPicker({ visible, onClose, onSelect, excludeIds = [] }: ProductPickerProps) {
  const [search, setSearch] = useState("");
  const { data, isLoading } = useProducts({ search, limit: 50 });
  const products: Product[] = (data as any)?.data ?? [];
  const filtered = excludeIds.length > 0 ? products.filter((p) => !excludeIds.includes(p.id)) : products;

  return (
    <Sheet visible={visible} onClose={onClose} title="Select Product">
      <SearchInput value={search} onChangeText={setSearch} placeholder="Search products\u2026" />
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        style={styles.list}
        renderItem={({ item }) => {
          const status = getStockStatus(Number(item.currentQty), Number(item.reorderPoint));
          return (
            <Pressable style={styles.row} onPress={() => { onSelect(item); onClose(); }}>
              <Package size={16} color={colors.textMuted} strokeWidth={1.8} />
              <View style={styles.info}>
                <Text style={styles.name} numberOfLines={1}>{item.name}</Text>
                <Text style={styles.meta}>{formatQuantity(Number(item.currentQty))} {item.unit}</Text>
              </View>
              <Badge label={status === "in-stock" ? "In Stock" : status === "low" ? "Low" : "Out"} variant={status === "in-stock" ? "green" : status === "low" ? "yellow" : "red"} />
            </Pressable>
          );
        }}
        ListEmptyComponent={<Text style={styles.empty}>{isLoading ? "Loading\u2026" : "No products found"}</Text>}
      />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  list: { marginTop: spacing.md, maxHeight: 400 },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "rgba(226,230,235,0.4)" },
  info: { flex: 1, minWidth: 0 },
  name: { ...typography.subtitle, fontWeight: "500", color: colors.navy },
  meta: { ...typography.caption, color: colors.textMuted, fontVariant: ["tabular-nums"] },
  empty: { ...typography.body, color: colors.textMuted, textAlign: "center", paddingVertical: spacing["3xl"] },
});
