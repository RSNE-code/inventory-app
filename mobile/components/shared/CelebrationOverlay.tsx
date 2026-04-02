/**
 * CelebrationOverlay — success animation with check mark and fading rings.
 */
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  withDelay,
  withSequence,
  runOnJS,
} from "react-native-reanimated";
import { Check } from "lucide-react-native";
import { colors } from "@/constants/colors";
import { radius } from "@/constants/layout";

interface CelebrationOverlayProps {
  visible: boolean;
  onComplete?: () => void;
}

export function CelebrationOverlay({ visible, onComplete }: CelebrationOverlayProps) {
  const checkScale = useSharedValue(0);
  const ringScale = useSharedValue(0.5);
  const ringOpacity = useSharedValue(0);
  const overlayOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      overlayOpacity.value = withTiming(1, { duration: 150 });
      checkScale.value = withDelay(
        100,
        withSpring(1, { damping: 12, stiffness: 200 })
      );
      ringScale.value = withDelay(
        200,
        withTiming(3, { duration: 800 })
      );
      ringOpacity.value = withDelay(
        200,
        withSequence(
          withTiming(0.6, { duration: 200 }),
          withTiming(0, { duration: 600 })
        )
      );
      // Auto-dismiss
      overlayOpacity.value = withDelay(
        1200,
        withTiming(0, { duration: 300 }, () => {
          if (onComplete) runOnJS(onComplete)();
        })
      );
    } else {
      checkScale.value = 0;
      ringScale.value = 0.5;
      ringOpacity.value = 0;
      overlayOpacity.value = 0;
    }
  }, [visible]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const checkStyle = useAnimatedStyle(() => ({
    transform: [{ scale: checkScale.value }],
  }));

  const ringStyle = useAnimatedStyle(() => ({
    transform: [{ scale: ringScale.value }],
    opacity: ringOpacity.value,
  }));

  if (!visible) return null;

  return (
    <Animated.View style={[styles.overlay, overlayStyle]} pointerEvents="none">
      <View style={styles.center}>
        <Animated.View style={[styles.ring, ringStyle]} />
        <Animated.View style={[styles.checkCircle, checkStyle]}>
          <Check size={32} color={colors.textInverse} strokeWidth={3} />
        </Animated.View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(11, 29, 58, 0.3)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999,
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
  },
  ring: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: colors.statusGreen,
  },
  checkCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.statusGreen,
    alignItems: "center",
    justifyContent: "center",
  },
});
