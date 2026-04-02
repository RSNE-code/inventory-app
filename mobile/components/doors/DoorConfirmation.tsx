/**
 * DoorConfirmation — confirm door specs before creation.
 */
import { StyleSheet, View, Text } from "react-native";
import { CheckCircle } from "lucide-react-native";
import { DoorPreview } from "./DoorPreview";
import { DoorDiagram } from "./DoorDiagram";
import { Button } from "@/components/ui/Button";
import { colors } from "@/constants/colors";
import { type as typography } from "@/constants/typography";
import { spacing } from "@/constants/layout";
import type { DoorSpecs } from "@/lib/door-specs";

interface DoorConfirmationProps {
  specs: Partial<DoorSpecs>;
  name: string;
  onConfirm: () => void;
  onBack: () => void;
  loading?: boolean;
}

export function DoorConfirmation({ specs, name, onConfirm, onBack, loading }: DoorConfirmationProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Confirm Door Specs</Text>
      <Text style={styles.name}>{name}</Text>

      <DoorDiagram specs={specs} />
      <DoorPreview specs={specs} />

      <View style={styles.actions}>
        <Button
          title={loading ? "Creating\u2026" : "Create Door"}
          icon={<CheckCircle size={18} color={colors.textInverse} strokeWidth={2} />}
          onPress={onConfirm}
          loading={loading}
          size="lg"
        />
        <Button title="Back" variant="ghost" onPress={onBack} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.lg },
  title: { ...typography.sectionTitle, color: colors.navy, textAlign: "center" },
  name: { ...typography.body, color: colors.textMuted, textAlign: "center" },
  actions: { gap: spacing.md, marginTop: spacing.md },
});
