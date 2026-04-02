/**
 * VoiceOrb — animated voice recording orb with radiating waves.
 */
import { useEffect } from "react";
import { StyleSheet, View, Pressable } from "react-native";
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming, withDelay,
  Easing, cancelAnimation,
} from "react-native-reanimated";
import { Mic, MicOff } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { colors } from "@/constants/colors";
import { radius } from "@/constants/layout";

interface VoiceOrbProps {
  isListening: boolean;
  onPress: () => void;
  size?: number;
}

export function VoiceOrb({ isListening, onPress, size = 64 }: VoiceOrbProps) {
  const wave1 = useSharedValue(1);
  const wave2 = useSharedValue(1);
  const wave3 = useSharedValue(1);
  const wave1Opacity = useSharedValue(0);
  const wave2Opacity = useSharedValue(0);
  const wave3Opacity = useSharedValue(0);

  useEffect(() => {
    if (isListening) {
      const config = { duration: 1800, easing: Easing.out(Easing.ease) };
      wave1.value = withRepeat(withTiming(2.2, config), -1, false);
      wave1Opacity.value = withRepeat(withTiming(0, config), -1, false);
      wave2.value = withDelay(400, withRepeat(withTiming(2.2, config), -1, false));
      wave2Opacity.value = withDelay(400, withRepeat(withTiming(0, config), -1, false));
      wave3.value = withDelay(800, withRepeat(withTiming(2.2, config), -1, false));
      wave3Opacity.value = withDelay(800, withRepeat(withTiming(0, config), -1, false));
    } else {
      [wave1, wave2, wave3, wave1Opacity, wave2Opacity, wave3Opacity].forEach(cancelAnimation);
      wave1.value = 1; wave2.value = 1; wave3.value = 1;
      wave1Opacity.value = 0; wave2Opacity.value = 0; wave3Opacity.value = 0;
    }
  }, [isListening]);

  const makeWaveStyle = (scale: Animated.SharedValue<number>, opacity: Animated.SharedValue<number>) =>
    useAnimatedStyle(() => ({
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
    }));

  const w1Style = makeWaveStyle(wave1, wave1Opacity);
  const w2Style = makeWaveStyle(wave2, wave2Opacity);
  const w3Style = makeWaveStyle(wave3, wave3Opacity);

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  };

  return (
    <View style={[styles.container, { width: size * 2.5, height: size * 2.5 }]}>
      {isListening && (
        <>
          <Animated.View style={[styles.wave, { width: size, height: size, borderRadius: size / 2 }, w1Style]} />
          <Animated.View style={[styles.wave, { width: size, height: size, borderRadius: size / 2 }, w2Style]} />
          <Animated.View style={[styles.wave, { width: size, height: size, borderRadius: size / 2 }, w3Style]} />
        </>
      )}
      <Pressable
        onPress={handlePress}
        style={[
          styles.orb,
          { width: size, height: size, borderRadius: size / 2 },
          isListening && styles.orbActive,
        ]}
      >
        {isListening ? (
          <MicOff size={size * 0.4} color={colors.textInverse} strokeWidth={2} />
        ) : (
          <Mic size={size * 0.4} color={colors.brandOrange} strokeWidth={2} />
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { alignItems: "center", justifyContent: "center" },
  wave: {
    position: "absolute", borderWidth: 2, borderColor: colors.brandOrange,
  },
  orb: {
    backgroundColor: colors.surfaceSecondary, alignItems: "center", justifyContent: "center",
    borderWidth: 2, borderColor: colors.border,
  },
  orbActive: {
    backgroundColor: colors.brandOrange, borderColor: colors.brandOrange,
  },
});
