/**
 * Sheet — bottom sheet modal matching web's sheet.tsx.
 */
import { StyleSheet, View, Text, Modal, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from "react-native-reanimated";
import { useIsTablet } from "@/lib/hooks/useDeviceType";
import { colors } from "@/constants/colors";
import { type as typography } from "@/constants/typography";
import { spacing, radius } from "@/constants/layout";
import { shadowBrandLg } from "@/constants/shadows";

interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}

export function Sheet({ visible, onClose, title, children }: SheetProps) {
  const insets = useSafeAreaInsets();
  const isTablet = useIsTablet();

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(150)} style={styles.overlay}>
        <Pressable style={styles.backdrop} onPress={onClose} />
        <Animated.View
          entering={SlideInDown.springify().damping(20).stiffness(150)}
          exiting={SlideOutDown.duration(200)}
          style={[
            styles.sheet,
            { paddingBottom: insets.bottom + spacing.lg },
            isTablet ? styles.sheetTablet : undefined,
          ]}
        >
          <View style={styles.handle} />
          {title && <Text style={styles.title}>{title}</Text>}
          {children}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: "flex-end" },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: colors.overlayDark },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius["2xl"],
    borderTopRightRadius: radius["2xl"],
    padding: spacing.lg,
    maxHeight: "85%",
    ...shadowBrandLg,
  },
  handle: {
    width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border,
    alignSelf: "center", marginBottom: spacing.lg,
  },
  title: { ...typography.sectionTitle, color: colors.navy, marginBottom: spacing.lg },
  sheetTablet: { maxWidth: 600, alignSelf: "center" as const, width: "100%" as any },
});
