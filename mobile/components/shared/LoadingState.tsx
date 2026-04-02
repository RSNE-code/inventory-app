/**
 * LoadingState — centered activity indicator or skeleton rows.
 */
import { StyleSheet, View, ActivityIndicator } from "react-native";
import { colors } from "@/constants/colors";
import { spacing } from "@/constants/layout";

interface LoadingStateProps {
  fullScreen?: boolean;
}

export function LoadingState({ fullScreen = false }: LoadingStateProps) {
  return (
    <View style={[styles.container, fullScreen && styles.fullScreen]}>
      <ActivityIndicator size="large" color={colors.brandBlue} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing["4xl"],
  },
  fullScreen: {
    flex: 1,
  },
});
