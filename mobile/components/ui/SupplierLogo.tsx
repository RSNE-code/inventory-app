/**
 * SupplierLogo — displays supplier initial in a colored circle.
 * Matches web's supplier-logo.tsx.
 */
import { StyleSheet, View, Text } from "react-native";
import { colors } from "@/constants/colors";
import { type as typography } from "@/constants/typography";
import { radius } from "@/constants/layout";

interface SupplierLogoProps {
  name: string;
  size?: number;
}

const LOGO_COLORS = [
  colors.brandBlue,
  colors.brandOrange,
  colors.statusGreen,
  "#8B5CF6",
  "#EC4899",
  "#06B6D4",
];

export function SupplierLogo({ name, size = 36 }: SupplierLogoProps) {
  const initial = name.charAt(0).toUpperCase();
  const colorIndex = name.charCodeAt(0) % LOGO_COLORS.length;
  const bgColor = LOGO_COLORS[colorIndex];

  return (
    <View style={[styles.circle, { width: size, height: size, borderRadius: size / 2, backgroundColor: bgColor }]}>
      <Text style={[styles.initial, { fontSize: size * 0.4 }]}>{initial}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  circle: { alignItems: "center", justifyContent: "center" },
  initial: { color: colors.textInverse, fontWeight: "700" },
});
