/**
 * RampSpecForm — ramp specification inputs.
 */
import { StyleSheet, View } from "react-native";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { INSULATION_OPTIONS, DIAMOND_PLATE_OPTIONS, type RampSpecs } from "@/lib/panel-specs";
import { spacing } from "@/constants/layout";

interface RampSpecFormProps {
  specs: RampSpecs;
  onChange: (specs: RampSpecs) => void;
}

export function RampSpecForm({ specs, onChange }: RampSpecFormProps) {
  const update = (field: keyof RampSpecs, value: unknown) => onChange({ ...specs, [field]: value });

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Input label="Width (in)" value={String(specs.width || "")} onChangeText={(v) => update("width", parseFloat(v) || 0)} keyboardType="decimal-pad" style={styles.half} />
        <Input label="Length (in)" value={String(specs.length || "")} onChangeText={(v) => update("length", parseFloat(v) || 0)} keyboardType="decimal-pad" style={styles.half} />
      </View>
      <View style={styles.row}>
        <Input label="Height (in)" value={String(specs.height || "")} onChangeText={(v) => update("height", parseFloat(v) || 0)} keyboardType="decimal-pad" style={styles.half} />
        <Input label="Bottom Lip" value={String(specs.bottomLip || "")} onChangeText={(v) => update("bottomLip", parseFloat(v) || 0)} keyboardType="decimal-pad" style={styles.half} />
      </View>
      <Input label="Top Lip (in)" value={String(specs.topLip || "")} onChangeText={(v) => update("topLip", parseFloat(v) || 0)} keyboardType="decimal-pad" />
      <Select label="Insulation" value={specs.insulation} onValueChange={(v) => update("insulation", v)}
        options={INSULATION_OPTIONS.map((o) => ({ label: o, value: o }))} />
      <Select label="Diamond Plate" value={specs.diamondPlateThickness} onValueChange={(v) => update("diamondPlateThickness", v)}
        options={DIAMOND_PLATE_OPTIONS.map((o) => ({ label: o, value: o }))} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.lg },
  row: { flexDirection: "row", gap: spacing.md },
  half: { flex: 1 },
});
