/**
 * ErrorState — error message with retry button.
 */
import { StyleSheet, View, Text } from "react-native";
import { AlertTriangle } from "lucide-react-native";
import { colors } from "@/constants/colors";
import { type as typography } from "@/constants/typography";
import { spacing } from "@/constants/layout";
import { Button } from "@/components/ui/Button";

interface ErrorStateProps {
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  message = "Something went wrong",
  onRetry,
}: ErrorStateProps) {
  return (
    <View style={styles.container}>
      <AlertTriangle size={40} color={colors.statusRed} strokeWidth={1.5} />
      <Text style={styles.message}>{message}</Text>
      {onRetry && (
        <Button
          title="Try Again"
          variant="secondary"
          onPress={onRetry}
          style={styles.button}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing["4xl"],
    paddingHorizontal: spacing["2xl"],
    gap: spacing.md,
  },
  message: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: "center",
  },
  button: {
    marginTop: spacing.sm,
  },
});
