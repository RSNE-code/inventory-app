/**
 * Dialog — modal dialog matching web's dialog.tsx.
 */
import { StyleSheet, View, Text, Modal, Pressable } from "react-native";
import { colors } from "@/constants/colors";
import { type as typography } from "@/constants/typography";
import { spacing, radius } from "@/constants/layout";
import { shadowBrandLg } from "@/constants/shadows";

interface DialogProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
}

export function Dialog({ visible, onClose, title, description, children }: DialogProps) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <Text style={styles.title}>{title}</Text>
          {description && <Text style={styles.description}>{description}</Text>}
          {children && <View style={styles.content}>{children}</View>}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlayDark,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing["2xl"],
  },
  card: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: colors.card,
    borderRadius: radius["2xl"],
    padding: spacing["2xl"],
    ...shadowBrandLg,
  },
  title: { ...typography.sectionTitle, color: colors.navy },
  description: { ...typography.body, color: colors.textMuted, marginTop: spacing.sm },
  content: { marginTop: spacing.lg },
});
