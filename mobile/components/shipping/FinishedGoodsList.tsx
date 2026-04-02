/**
 * FinishedGoodsList — completed assemblies ready to ship.
 */
import { StyleSheet, View, Text, FlatList, Pressable } from "react-native";
import { Truck, Check } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/shared/EmptyState";
import { colors } from "@/constants/colors";
import { type as typography } from "@/constants/typography";
import { spacing, radius } from "@/constants/layout";
import type { Assembly } from "@/types/api";

interface FinishedGoodsListProps {
  assemblies: Assembly[];
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onBatchShip: () => void;
  loading?: boolean;
}

export function FinishedGoodsList({ assemblies, selectedIds, onToggleSelect, onBatchShip, loading }: FinishedGoodsListProps) {
  const completed = assemblies.filter((a) => a.status === "COMPLETED");

  if (completed.length === 0) {
    return (
      <EmptyState
        icon={<Truck size={48} color={colors.textMuted} strokeWidth={1.2} />}
        title="Nothing to ship"
        description="Completed assemblies will appear here"
      />
    );
  }

  return (
    <View style={styles.container}>
      {selectedIds.length > 0 && (
        <Button
          title={`Ship ${selectedIds.length} selected`}
          icon={<Truck size={18} color={colors.textInverse} strokeWidth={2} />}
          onPress={onBatchShip}
          loading={loading}
          size="lg"
        />
      )}
      {completed.map((item) => {
        const isSelected = selectedIds.includes(item.id);
        return (
          <Pressable key={item.id} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onToggleSelect(item.id); }}>
            <Card accent="green" style={isSelected ? styles.selected : undefined}>
              <View style={styles.row}>
                <View style={[styles.checkbox, isSelected && styles.checkboxActive]}>
                  {isSelected && <Check size={14} color={colors.textInverse} strokeWidth={3} />}
                </View>
                <View style={styles.info}>
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={styles.meta}>{item.type} {item.jobName ? `· ${item.jobName}` : ""}</Text>
                </View>
                <Badge label="Completed" variant="green" />
              </View>
            </Card>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.md },
  selected: { backgroundColor: colors.statusGreenBg },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  checkbox: { width: 26, height: 26, borderRadius: 13, borderWidth: 2.5, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  checkboxActive: { borderColor: colors.statusGreen, backgroundColor: colors.statusGreen },
  info: { flex: 1, minWidth: 0 },
  name: { ...typography.subtitle, fontWeight: "600", color: colors.navy },
  meta: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
});
