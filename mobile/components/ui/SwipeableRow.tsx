/**
 * SwipeableRow — swipe-to-delete with spring physics.
 * Matches web's swipeable-row.tsx / swipe-to-delete.tsx.
 */
import { StyleSheet, View, Text, Pressable } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  runOnJS,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { Trash2 } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { colors } from "@/constants/colors";
import { type as typography } from "@/constants/typography";
import { spacing, radius } from "@/constants/layout";
import { SPRING_CONFIG } from "@/constants/animations";

interface SwipeableRowProps {
  children: React.ReactNode;
  onDelete: () => void;
}

const DELETE_THRESHOLD = -80;

export function SwipeableRow({ children, onDelete }: SwipeableRowProps) {
  const translateX = useSharedValue(0);

  const triggerDelete = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    onDelete();
  };

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .onUpdate((e) => {
      translateX.value = Math.min(0, Math.max(-120, e.translationX));
    })
    .onEnd((e) => {
      if (e.translationX < DELETE_THRESHOLD) {
        translateX.value = withSpring(-120, SPRING_CONFIG);
      } else {
        translateX.value = withSpring(0, SPRING_CONFIG);
      }
    });

  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const deleteStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, Math.abs(translateX.value) / 80),
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.deleteAction, deleteStyle]}>
        <Pressable style={styles.deleteButton} onPress={triggerDelete}>
          <Trash2 size={20} color={colors.textInverse} strokeWidth={2} />
          <Text style={styles.deleteText}>Delete</Text>
        </Pressable>
      </Animated.View>
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.row, rowStyle]}>
          {children}
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: "relative", overflow: "hidden" },
  row: { backgroundColor: colors.card },
  deleteAction: {
    position: "absolute", right: 0, top: 0, bottom: 0, width: 120,
    backgroundColor: colors.statusRed, alignItems: "center", justifyContent: "center",
  },
  deleteButton: { alignItems: "center", gap: spacing.xs },
  deleteText: { ...typography.caption, fontWeight: "600", color: colors.textInverse },
});
