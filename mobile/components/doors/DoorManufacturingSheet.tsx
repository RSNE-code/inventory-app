/**
 * DoorManufacturingSheet — clipboard-style shop floor view.
 */
import { StyleSheet, View, Text } from "react-native";
import { Clipboard, Wrench } from "lucide-react-native";
import { Card } from "@/components/ui/Card";
import { getDoorFieldLabel, formatDoorFieldValue } from "@/lib/door-field-labels";
import { matchDoorRecipe } from "@/lib/door-recipes";
import { colors } from "@/constants/colors";
import { type as typography } from "@/constants/typography";
import { spacing, radius } from "@/constants/layout";
import type { DoorSpecs } from "@/lib/door-specs";

interface DoorManufacturingSheetProps {
  specs: Partial<DoorSpecs>;
  name: string;
}

const MFG_FIELDS = [
  "widthInClear", "heightInClear", "frameType", "hingeSide", "swingDirection",
  "gasketType", "insulationType", "insulationThickness", "hasWindow", "windowSize",
  "hasKickPlate", "hasHeaterCable", "heaterCableLength",
];

export function DoorManufacturingSheet({ specs, name }: DoorManufacturingSheetProps) {
  const recipe = matchDoorRecipe(specs);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Clipboard size={20} color={colors.textInverse} strokeWidth={2} />
        <Text style={styles.headerTitle}>Manufacturing Sheet</Text>
      </View>
      <Text style={styles.doorName}>{name}</Text>

      {/* Specs table */}
      <Card style={styles.specsCard}>
        {MFG_FIELDS.map((field) => {
          const val = specs[field as keyof DoorSpecs];
          if (val === undefined || val === null || val === "") return null;
          return (
            <View key={field} style={styles.row}>
              <Text style={styles.label}>{getDoorFieldLabel(field)}</Text>
              <Text style={styles.value}>{formatDoorFieldValue(field, val)}</Text>
            </View>
          );
        })}
      </Card>

      {/* Bill of materials */}
      {recipe && (
        <Card style={styles.bomCard}>
          <View style={styles.bomHeader}>
            <Wrench size={16} color={colors.brandOrange} strokeWidth={2} />
            <Text style={styles.bomTitle}>Components — {recipe.name}</Text>
          </View>
          {recipe.components.map((comp, i) => (
            <View key={i} style={styles.bomRow}>
              <Text style={styles.bomName}>{comp.name}</Text>
              <Text style={styles.bomQty}>x{comp.qty}</Text>
            </View>
          ))}
        </Card>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.md },
  header: {
    flexDirection: "row", alignItems: "center", gap: spacing.sm,
    backgroundColor: colors.navy, padding: spacing.lg, borderRadius: radius.xl,
  },
  headerTitle: { ...typography.cardTitle, color: colors.textInverse },
  doorName: { ...typography.sectionTitle, color: colors.navy },
  specsCard: {},
  row: {
    flexDirection: "row", justifyContent: "space-between", paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "rgba(226,230,235,0.4)",
  },
  label: { ...typography.body, color: colors.textMuted },
  value: { ...typography.body, fontWeight: "600", color: colors.navy },
  bomCard: {},
  bomHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.md },
  bomTitle: { ...typography.cardTitle, color: colors.navy },
  bomRow: {
    flexDirection: "row", justifyContent: "space-between", paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "rgba(226,230,235,0.4)",
  },
  bomName: { ...typography.body, color: colors.textPrimary, flex: 1 },
  bomQty: { ...typography.subtitle, fontWeight: "700", color: colors.brandOrange, fontVariant: ["tabular-nums"] },
});
