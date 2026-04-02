/**
 * SupplierPicker — search and select supplier from list.
 */
import { useState, useMemo } from "react";
import { StyleSheet, View, Text, FlatList, Pressable } from "react-native";
import { Building2, Check } from "lucide-react-native";
import { SearchInput } from "@/components/ui/SearchInput";
import { Card } from "@/components/ui/Card";
import { useSuppliers } from "@/hooks/use-receiving";
import { colors } from "@/constants/colors";
import { type as typography } from "@/constants/typography";
import { spacing, radius } from "@/constants/layout";
import type { Supplier } from "@/types/api";

interface SupplierPickerProps {
  selectedId: string;
  onSelect: (supplier: Supplier) => void;
}

export function SupplierPicker({ selectedId, onSelect }: SupplierPickerProps) {
  const { data } = useSuppliers();
  const [search, setSearch] = useState("");

  const suppliers: Supplier[] = (data as any)?.data ?? [];

  const filtered = useMemo(() => {
    if (!search) return suppliers;
    const q = search.toLowerCase();
    return suppliers.filter((s) => s.name.toLowerCase().includes(q));
  }, [suppliers, search]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Select Supplier</Text>
      <SearchInput value={search} onChangeText={setSearch} placeholder="Search suppliers\u2026" />
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        style={styles.list}
        renderItem={({ item }) => {
          const isSelected = item.id === selectedId;
          return (
            <Pressable
              onPress={() => onSelect(item)}
              style={[styles.row, isSelected && styles.rowSelected]}
            >
              <Building2 size={18} color={isSelected ? colors.brandBlue : colors.textMuted} strokeWidth={1.8} />
              <Text style={[styles.name, isSelected && styles.nameSelected]}>{item.name}</Text>
              {isSelected && <Check size={18} color={colors.brandBlue} strokeWidth={2} />}
            </Pressable>
          );
        }}
        ItemSeparatorComponent={() => <View style={styles.sep} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.md },
  title: { ...typography.sectionTitle, color: colors.navy },
  list: { maxHeight: 300 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.lg,
  },
  rowSelected: { backgroundColor: colors.statusBlueBg },
  name: { ...typography.subtitle, color: colors.textPrimary, flex: 1 },
  nameSelected: { color: colors.brandBlue, fontWeight: "600" },
  sep: { height: StyleSheet.hairlineWidth, backgroundColor: colors.borderLight },
});
