/**
 * PanelDimensionEditor — edit panel dimensions.
 */
import { StyleSheet, View, Text } from "react-native";
import { Input } from "@/components/ui/Input";
import { colors } from "@/constants/colors";
import { type as typography } from "@/constants/typography";
import { spacing } from "@/constants/layout";

interface PanelDimensionEditorProps {
  length: string;
  width: string;
  thickness: string;
  onLengthChange: (v: string) => void;
  onWidthChange: (v: string) => void;
  onThicknessChange: (v: string) => void;
}

export function PanelDimensionEditor({ length, width, thickness, onLengthChange, onWidthChange, onThicknessChange }: PanelDimensionEditorProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Panel Dimensions</Text>
      <View style={styles.row}>
        <Input label="Length (ft)" value={length} onChangeText={onLengthChange} keyboardType="decimal-pad" style={styles.third} />
        <Input label="Width (in)" value={width} onChangeText={onWidthChange} keyboardType="decimal-pad" style={styles.third} />
        <Input label='Thickness (")' value={thickness} onChangeText={onThicknessChange} keyboardType="decimal-pad" style={styles.third} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  title: { ...typography.cardTitle, color: colors.navy },
  row: { flexDirection: "row", gap: spacing.sm },
  third: { flex: 1 },
});
