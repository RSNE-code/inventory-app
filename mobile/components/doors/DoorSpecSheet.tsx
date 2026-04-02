/**
 * DoorSpecSheet — full specifications view with all fields.
 */
import { StyleSheet, ScrollView, View, Text } from "react-native";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { getDoorFieldLabel, formatDoorFieldValue } from "@/lib/door-field-labels";
import { colors } from "@/constants/colors";
import { type as typography } from "@/constants/typography";
import { spacing } from "@/constants/layout";
import type { DoorSpecs } from "@/lib/door-specs";

interface DoorSpecSheetProps {
  specs: Partial<DoorSpecs>;
}

const SECTIONS = [
  { title: "Dimensions", fields: ["widthInClear", "heightInClear"] },
  { title: "Configuration", fields: ["doorCategory", "temperatureType", "openingType", "frameType", "hingeSide", "swingDirection"] },
  { title: "Insulation & Gasket", fields: ["insulationType", "insulationThickness", "gasketType"] },
  { title: "Features", fields: ["hasWindow", "windowSize", "hasKickPlate", "kickPlateHeight", "hasHeaterCable", "heaterCableLength", "isExterior", "hasSweep", "hasThreshold", "highSill"] },
  { title: "Hardware — Swing", fields: ["hingeManufacturer", "hingeModel", "latchManufacturer", "latchModel", "closerManufacturer", "closerModel", "insideReleaseManufacturer", "insideReleaseModel"] },
  { title: "Hardware — Slider", fields: ["trackModel", "doorPull", "strikeModel", "tongueModel"] },
];

export function DoorSpecSheet({ specs }: DoorSpecSheetProps) {
  return (
    <View style={styles.container}>
      {SECTIONS.map((section) => {
        const visibleFields = section.fields.filter((f) => {
          const val = specs[f as keyof DoorSpecs];
          return val !== undefined && val !== null && val !== "";
        });
        if (visibleFields.length === 0) return null;

        return (
          <Card key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {visibleFields.map((field) => (
              <View key={field} style={styles.row}>
                <Text style={styles.fieldLabel}>{getDoorFieldLabel(field)}</Text>
                <Text style={styles.fieldValue}>
                  {formatDoorFieldValue(field, specs[field as keyof DoorSpecs])}
                </Text>
              </View>
            ))}
          </Card>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.md },
  section: {},
  sectionTitle: { ...typography.cardTitle, color: colors.navy, marginBottom: spacing.sm },
  row: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(226,230,235,0.4)",
  },
  fieldLabel: { ...typography.body, color: colors.textMuted, flex: 1 },
  fieldValue: { ...typography.body, fontWeight: "500", color: colors.navy, textAlign: "right", flex: 1 },
});
