/**
 * NetworkBanner — shows a bar when the device is offline.
 */
import { useEffect, useState } from "react";
import { StyleSheet, Text } from "react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import NetInfo from "@react-native-community/netinfo";
import { colors } from "@/constants/colors";
import { type as typography } from "@/constants/typography";
import { spacing } from "@/constants/layout";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export function NetworkBanner() {
  const [isOffline, setIsOffline] = useState(false);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOffline(state.isConnected === false);
    });
    return unsubscribe;
  }, []);

  if (!isOffline) return null;

  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(200)}
      style={[styles.banner, { paddingTop: insets.top + spacing.xs }]}
    >
      <Text style={styles.text}>No internet connection</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.statusRed,
    paddingBottom: spacing.sm,
    zIndex: 100,
    alignItems: "center",
  },
  text: {
    ...typography.caption,
    fontWeight: "600",
    color: colors.textInverse,
  },
});
