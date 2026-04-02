/**
 * TapeMeasureInput — dimension input with inches + fractions.
 */
import { useState } from "react";
import { StyleSheet, View, Text, Pressable } from "react-native";
import * as Haptics from "expo-haptics";
import { Input } from "@/components/ui/Input";
import { FRACTIONS, formatFractionalInches } from "@/lib/door-specs";
import { colors } from "@/constants/colors";
import { type as typography } from "@/constants/typography";
import { spacing, radius } from "@/constants/layout";

interface TapeMeasureInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
}

export function TapeMeasureInput({ label, value, onChange }: TapeMeasureInputProps) {
  const [showFractions, setShowFractions] = useState(false);

  return (
    <View style={styles.container}>
      <Input
        label={label}
        value={value}
        onChangeText={onChange}
        placeholder={"e.g. 36, 3'-6\", 36-3/16"}
        keyboardType="default"
      />
      <Pressable
        onPress={() => setShowFractions(!showFractions)}
        style={styles.fractionToggle}
      >
        <Text style={styles.fractionToggleText}>
          {showFractions ? "Hide fractions" : "Add fraction"}
        </Text>
      </Pressable>
      {showFractions && (
        <View style={styles.fractionGrid}>
          {FRACTIONS.filter((f) => f.decimal > 0).map((f) => (
            <Pressable
              key={f.label}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                const base = value.replace(/-\d+\/\d+$/, "").trim();
                onChange(base ? `${base}-${f.label}` : f.label);
                setShowFractions(false);
              }}
              style={styles.fractionChip}
            >
              <Text style={styles.fractionText}>{f.label}</Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xs },
  fractionToggle: { alignSelf: "flex-start", paddingVertical: spacing.xs },
  fractionToggleText: { ...typography.caption, color: colors.brandBlue, fontWeight: "600" },
  fractionGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  fractionChip: {
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderRadius: radius.full, backgroundColor: colors.surfaceSecondary,
  },
  fractionText: { ...typography.caption, fontWeight: "600", color: colors.textSecondary },
});
