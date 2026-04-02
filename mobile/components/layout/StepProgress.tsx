/**
 * StepProgress — multi-step progress indicator.
 * Matches web's step-progress.tsx.
 */
import { StyleSheet, View, Text } from "react-native";
import { Check } from "lucide-react-native";
import { colors } from "@/constants/colors";
import { type as typography } from "@/constants/typography";
import { spacing, radius } from "@/constants/layout";

interface StepProgressProps {
  steps: string[];
  currentStep: number;
}

export function StepProgress({ steps, currentStep }: StepProgressProps) {
  return (
    <View style={styles.container}>
      {steps.map((step, i) => {
        const isComplete = i < currentStep;
        const isCurrent = i === currentStep;
        return (
          <View key={step} style={styles.stepWrap}>
            <View style={styles.stepRow}>
              <View
                style={[
                  styles.circle,
                  isComplete && styles.circleComplete,
                  isCurrent && styles.circleCurrent,
                ]}
              >
                {isComplete ? (
                  <Check size={14} color={colors.textInverse} strokeWidth={3} />
                ) : (
                  <Text style={[styles.number, (isComplete || isCurrent) && styles.numberActive]}>
                    {i + 1}
                  </Text>
                )}
              </View>
              <Text
                style={[
                  styles.label,
                  isCurrent && styles.labelCurrent,
                  isComplete && styles.labelComplete,
                ]}
              >
                {step}
              </Text>
            </View>
            {i < steps.length - 1 && (
              <View style={[styles.line, isComplete && styles.lineComplete]} />
            )}
          </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexDirection: "row", alignItems: "center" },
  stepWrap: { flex: 1, flexDirection: "row", alignItems: "center" },
  stepRow: { alignItems: "center", gap: spacing.xs },
  circle: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.surfaceSecondary, borderWidth: 2,
    borderColor: colors.border, alignItems: "center", justifyContent: "center",
  },
  circleComplete: { backgroundColor: colors.statusGreen, borderColor: colors.statusGreen },
  circleCurrent: { backgroundColor: colors.brandBlue, borderColor: colors.brandBlue },
  number: { ...typography.caption, fontWeight: "700", color: colors.textMuted },
  numberActive: { color: colors.textInverse },
  label: { ...typography.caption, color: colors.textMuted, textAlign: "center" },
  labelCurrent: { color: colors.brandBlue, fontWeight: "600" },
  labelComplete: { color: colors.statusGreen },
  line: { flex: 1, height: 2, backgroundColor: colors.border, marginHorizontal: spacing.xs },
  lineComplete: { backgroundColor: colors.statusGreen },
});
