/**
 * Separator — horizontal divider line.
 */
import { StyleSheet, View, type ViewStyle } from "react-native";
import { colors } from "@/constants/colors";

interface SeparatorProps {
  style?: ViewStyle;
}

export function Separator({ style }: SeparatorProps) {
  return <View style={[styles.separator, style]} />;
}

const styles = StyleSheet.create({
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
});
