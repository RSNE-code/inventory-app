/**
 * StartBuildModal — confirms starting an assembly build.
 * Matches web's start-build-modal.tsx.
 */
import { StyleSheet, View, Text } from "react-native";
import { Play } from "lucide-react-native";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { colors } from "@/constants/colors";
import { type as typography } from "@/constants/typography";
import { spacing, radius } from "@/constants/layout";

interface StartBuildModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirm: () => void;
  assemblyName: string;
  loading?: boolean;
}

export function StartBuildModal({ visible, onClose, onConfirm, assemblyName, loading }: StartBuildModalProps) {
  return (
    <Dialog visible={visible} onClose={onClose} title="Start Build">
      <View style={styles.iconWrap}>
        <Play size={28} color={colors.brandOrange} strokeWidth={2} />
      </View>
      <Text style={styles.message}>
        Start production on <Text style={styles.bold}>{assemblyName}</Text>? This will log the start timestamp and move it to In Production.
      </Text>
      <View style={styles.actions}>
        <Button title="Cancel" variant="secondary" onPress={onClose} />
        <Button title={loading ? "Starting\u2026" : "Start Build"} onPress={onConfirm} loading={loading} />
      </View>
    </Dialog>
  );
}

const styles = StyleSheet.create({
  iconWrap: {
    width: 56, height: 56, borderRadius: radius.xl,
    backgroundColor: "rgba(232, 121, 43, 0.12)",
    alignItems: "center", justifyContent: "center",
    alignSelf: "center", marginBottom: spacing.lg,
  },
  message: { ...typography.body, color: colors.textSecondary, textAlign: "center" },
  bold: { fontWeight: "600", color: colors.navy },
  actions: { flexDirection: "row", gap: spacing.md, marginTop: spacing["2xl"] },
});
