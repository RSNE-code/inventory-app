/**
 * OptionPicker — predefined option grid for door specs.
 */
import { StyleSheet, View, Text, Pressable } from "react-native";
import * as Haptics from "expo-haptics";
import { colors } from "@/constants/colors";
import { type as typography } from "@/constants/typography";
import { spacing, radius } from "@/constants/layout";

interface OptionPickerProps {
  label: string;
  options: { label: string; value: string }[];
  value: string;
  onChange: (value: string) => void;
  columns?: number;
}

export function OptionPicker({ label, options, value, onChange, columns = 2 }: OptionPickerProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.grid, { flexWrap: "wrap" }]}>
        {options.map((opt) => {
          const isActive = opt.value === value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onChange(opt.value); }}
              style={[styles.chip, { width: `${100 / columns - 2}%` }, isActive && styles.chipActive]}
            >
              <Text style={[styles.chipText, isActive && styles.chipTextActive]}>{opt.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  label: { ...typography.caption, fontWeight: "500", color: colors.textSecondary },
  grid: { flexDirection: "row", gap: spacing.sm },
  chip: {
    paddingVertical: spacing.md, borderRadius: radius.xl, borderWidth: 1.5,
    borderColor: colors.border, alignItems: "center",
  },
  chipActive: { borderColor: colors.brandBlue, backgroundColor: colors.statusBlueBg },
  chipText: { ...typography.subtitle, fontWeight: "600", color: colors.textSecondary },
  chipTextActive: { color: colors.brandBlue },
});
