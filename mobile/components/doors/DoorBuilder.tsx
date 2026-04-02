/**
 * DoorBuilder — interactive spec builder with step-by-step fields.
 */
import { useState } from "react";
import { StyleSheet, ScrollView, View, Text } from "react-native";
import { InterviewStep } from "./InterviewStep";
import { OptionPicker } from "./OptionPicker";
import { TapeMeasureInput } from "./TapeMeasureInput";
import { BooleanField } from "./SpecPrimitives";
import { DoorDiagram } from "./DoorDiagram";
import { Button } from "@/components/ui/Button";
import { findSpecGaps, type DoorSpecs, type DoorCategory } from "@/lib/door-specs";
import { colors } from "@/constants/colors";
import { type as typography } from "@/constants/typography";
import { spacing } from "@/constants/layout";

interface DoorBuilderProps {
  specs: Partial<DoorSpecs>;
  onUpdate: (specs: Partial<DoorSpecs>) => void;
  onComplete: () => void;
}

export function DoorBuilder({ specs, onUpdate, onComplete }: DoorBuilderProps) {
  const gaps = findSpecGaps(specs);
  const hasRequiredFields = gaps.length === 0;

  const updateField = (field: string, value: unknown) => {
    onUpdate({ ...specs, [field]: value });
  };

  return (
    <View style={styles.container}>
      {/* Live preview */}
      {specs.widthInClear && specs.heightInClear && (
        <DoorDiagram specs={specs} />
      )}

      {/* Category selection */}
      {!specs.doorCategory && (
        <InterviewStep
          question="What type of door?"
          options={[
            { label: "Hinged Cooler", value: "HINGED_COOLER" },
            { label: "Hinged Freezer", value: "HINGED_FREEZER" },
            { label: "Sliding", value: "SLIDING" },
          ]}
          selectedValue={specs.doorCategory}
          onSelect={(v) => updateField("doorCategory", v)}
        />
      )}

      {/* Dimensions */}
      {specs.doorCategory && (
        <>
          <TapeMeasureInput
            label="Width in Clear"
            value={specs.widthInClear ?? ""}
            onChange={(v) => updateField("widthInClear", v)}
          />
          <TapeMeasureInput
            label="Height in Clear"
            value={specs.heightInClear ?? ""}
            onChange={(v) => updateField("heightInClear", v)}
          />
        </>
      )}

      {/* Frame type (hinged only) */}
      {specs.doorCategory && specs.doorCategory !== "SLIDING" && (
        <>
          <OptionPicker
            label="Frame Type"
            options={[
              { label: "Full Frame", value: "FULL_FRAME" },
              { label: "Face Frame", value: "FACE_FRAME" },
              { label: "Bally Type", value: "BALLY_TYPE" },
            ]}
            value={specs.frameType ?? ""}
            onChange={(v) => updateField("frameType", v)}
            columns={3}
          />
          <OptionPicker
            label="Hinge Side"
            options={[
              { label: "Left", value: "LEFT" },
              { label: "Right", value: "RIGHT" },
            ]}
            value={specs.hingeSide ?? ""}
            onChange={(v) => updateField("hingeSide", v)}
          />
          <OptionPicker
            label="Swing Direction"
            options={[
              { label: "Swing In", value: "IN" },
              { label: "Swing Out", value: "OUT" },
            ]}
            value={specs.swingDirection ?? ""}
            onChange={(v) => updateField("swingDirection", v)}
          />
          <OptionPicker
            label="Gasket Type"
            options={[
              { label: "Magnetic", value: "MAGNETIC" },
              { label: "Neoprene", value: "NEOPRENE" },
            ]}
            value={specs.gasketType ?? ""}
            onChange={(v) => updateField("gasketType", v)}
          />
        </>
      )}

      {/* Insulation */}
      {specs.doorCategory && (
        <>
          <OptionPicker
            label="Insulation Type"
            options={[
              { label: "IMP", value: "IMP" },
              { label: "EPS", value: "EPS" },
              { label: "PIR", value: "PIR" },
            ]}
            value={specs.insulationType ?? ""}
            onChange={(v) => updateField("insulationType", v)}
            columns={3}
          />
          <OptionPicker
            label="Insulation Thickness"
            options={[
              { label: '2"', value: '2"' },
              { label: '3"', value: '3"' },
              { label: '4"', value: '4"' },
              { label: '5"', value: '5"' },
              { label: '6"', value: '6"' },
            ]}
            value={specs.insulationThickness ?? ""}
            onChange={(v) => updateField("insulationThickness", v)}
            columns={5}
          />
        </>
      )}

      {/* Features */}
      {specs.doorCategory && (
        <>
          <BooleanField label="Window" value={!!specs.hasWindow} onChange={(v) => updateField("hasWindow", v)} />
          <BooleanField label="Kick Plate" value={!!specs.hasKickPlate} onChange={(v) => updateField("hasKickPlate", v)} />
          <BooleanField label="Heater Cable" value={!!specs.hasHeaterCable} onChange={(v) => updateField("hasHeaterCable", v)} />
          <BooleanField label="Exterior Door" value={!!specs.isExterior} onChange={(v) => updateField("isExterior", v)} />
          <BooleanField label="Sweep" value={!!specs.hasSweep} onChange={(v) => updateField("hasSweep", v)} />
        </>
      )}

      {/* Continue */}
      {specs.doorCategory && (
        <Button
          title="Continue to Confirmation"
          onPress={onComplete}
          disabled={!specs.widthInClear || !specs.heightInClear}
          size="lg"
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xl },
});
