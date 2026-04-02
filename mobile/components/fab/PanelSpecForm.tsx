/**
 * PanelSpecForm — panel spec inputs (width, length, insulation, materials).
 */
import { StyleSheet, View } from "react-native";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { INSULATION_OPTIONS, INSULATION_THICKNESS_OPTIONS, PANEL_MATERIAL_OPTIONS, type PanelSpecs } from "@/lib/panel-specs";
import { spacing } from "@/constants/layout";

interface PanelSpecFormProps {
  specs: PanelSpecs;
  onChange: (specs: PanelSpecs) => void;
  type: "WALL_PANEL" | "FLOOR_PANEL";
}

export function PanelSpecForm({ specs, onChange, type }: PanelSpecFormProps) {
  const update = (field: keyof PanelSpecs, value: unknown) => onChange({ ...specs, [field]: value });

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Input label="Width (in)" value={String(specs.width || "")} onChangeText={(v) => update("width", parseFloat(v) || 0)} keyboardType="decimal-pad" style={styles.half} />
        <Input label="Length (in)" value={String(specs.length || "")} onChangeText={(v) => update("length", parseFloat(v) || 0)} keyboardType="decimal-pad" style={styles.half} />
      </View>
      <Select label="Insulation" value={specs.insulation} onValueChange={(v) => update("insulation", v)}
        options={INSULATION_OPTIONS.map((o) => ({ label: o, value: o }))} />
      <Select label="Thickness" value={specs.insulationThickness} onValueChange={(v) => update("insulationThickness", v)}
        options={INSULATION_THICKNESS_OPTIONS.map((o) => ({ label: o, value: o }))} />
      <Select label="Side 1 Material" value={specs.side1Material} onValueChange={(v) => update("side1Material", v)}
        options={PANEL_MATERIAL_OPTIONS.map((o) => ({ label: o, value: o }))} />
      <Select label="Side 2 Material" value={specs.side2Material} onValueChange={(v) => update("side2Material", v)}
        options={PANEL_MATERIAL_OPTIONS.map((o) => ({ label: o, value: o }))} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.lg },
  row: { flexDirection: "row", gap: spacing.md },
  half: { flex: 1 },
});
