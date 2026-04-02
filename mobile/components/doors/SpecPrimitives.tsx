/**
 * SpecPrimitives — low-level spec input components for doors.
 */
import { StyleSheet, View, Text, Switch } from "react-native";
import { Input } from "@/components/ui/Input";
import { OptionPicker } from "./OptionPicker";
import { TapeMeasureInput } from "./TapeMeasureInput";
import { colors } from "@/constants/colors";
import { type as typography } from "@/constants/typography";
import { spacing } from "@/constants/layout";

interface BooleanFieldProps {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}

export function BooleanField({ label, value, onChange }: BooleanFieldProps) {
  return (
    <View style={styles.boolRow}>
      <Text style={styles.boolLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.border, true: colors.brandBlue }}
        thumbColor={colors.background}
      />
    </View>
  );
}

interface DimensionFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

export function DimensionField({ label, value, onChange }: DimensionFieldProps) {
  return <TapeMeasureInput label={label} value={value} onChange={onChange} />;
}

interface TextFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export function TextField({ label, value, onChange, placeholder }: TextFieldProps) {
  return <Input label={label} value={value} onChangeText={onChange} placeholder={placeholder} />;
}

export { OptionPicker };

const styles = StyleSheet.create({
  boolRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingVertical: spacing.md,
  },
  boolLabel: { ...typography.subtitle, color: colors.textPrimary },
});
