/**
 * InterviewStep — single question in door creation interview.
 */
import { StyleSheet, View, Text, Pressable } from "react-native";
import * as Haptics from "expo-haptics";
import { colors } from "@/constants/colors";
import { type as typography } from "@/constants/typography";
import { spacing, radius } from "@/constants/layout";

interface InterviewStepProps {
  question: string;
  description?: string;
  options: { label: string; value: string }[];
  selectedValue?: string;
  onSelect: (value: string) => void;
}

export function InterviewStep({ question, description, options, selectedValue, onSelect }: InterviewStepProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.question}>{question}</Text>
      {description && <Text style={styles.description}>{description}</Text>}
      <View style={styles.options}>
        {options.map((opt) => {
          const isSelected = opt.value === selectedValue;
          return (
            <Pressable
              key={opt.value}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onSelect(opt.value); }}
              style={[styles.option, isSelected && styles.optionSelected]}
            >
              <Text style={[styles.optionLabel, isSelected && styles.optionLabelSelected]}>{opt.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.md },
  question: { ...typography.sectionTitle, color: colors.navy },
  description: { ...typography.body, color: colors.textMuted },
  options: { gap: spacing.sm },
  option: {
    paddingVertical: spacing.lg, paddingHorizontal: spacing.xl,
    borderRadius: radius.xl, borderWidth: 1.5, borderColor: colors.border,
    backgroundColor: colors.card,
  },
  optionSelected: { borderColor: colors.brandBlue, backgroundColor: colors.statusBlueBg },
  optionLabel: { ...typography.subtitle, fontWeight: "600", color: colors.textPrimary, textAlign: "center" },
  optionLabelSelected: { color: colors.brandBlue },
});
