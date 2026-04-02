/**
 * DoorPreview — compact door summary card with key specs.
 */
import { StyleSheet, View, Text } from "react-native";
import { DoorOpen, Thermometer } from "lucide-react-native";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { getDoorFieldLabel, formatDoorFieldValue } from "@/lib/door-field-labels";
import { colors } from "@/constants/colors";
import { type as typography } from "@/constants/typography";
import { spacing } from "@/constants/layout";
import type { DoorSpecs } from "@/lib/door-specs";

interface DoorPreviewProps {
  specs: Partial<DoorSpecs>;
}

const PREVIEW_FIELDS = ["widthInClear", "heightInClear", "frameType", "hingeSide", "gasketType"];

export function DoorPreview({ specs }: DoorPreviewProps) {
  const isFreezer = specs.temperatureType === "FREEZER" || specs.doorCategory === "HINGED_FREEZER";

  return (
    <Card accent={isFreezer ? "blue" : "green"}>
      <View style={styles.headerRow}>
        <DoorOpen size={20} color={colors.brandBlue} strokeWidth={1.5} />
        <Text style={styles.title}>
          {formatDoorFieldValue("doorCategory", specs.doorCategory)}
        </Text>
        <Badge label={isFreezer ? "Freezer" : "Cooler"} variant={isFreezer ? "blue" : "green"} />
      </View>
      {PREVIEW_FIELDS.map((field) => {
        const val = specs[field as keyof DoorSpecs];
        if (!val) return null;
        return (
          <View key={field} style={styles.specRow}>
            <Text style={styles.specLabel}>{getDoorFieldLabel(field)}</Text>
            <Text style={styles.specValue}>{formatDoorFieldValue(field, val)}</Text>
          </View>
        );
      })}
    </Card>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.md },
  title: { ...typography.cardTitle, color: colors.navy, flex: 1 },
  specRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: spacing.xs },
  specLabel: { ...typography.caption, color: colors.textMuted },
  specValue: { ...typography.caption, fontWeight: "600", color: colors.navy },
});
