/**
 * iPadPage — centered max-width container for forms on iPad.
 * Full-width on iPhone, constrained on iPad.
 */
import { StyleSheet, View, type ViewStyle } from "react-native";
import { useIsTablet } from "@/lib/hooks/useDeviceType";
import { FORM_MAX_WIDTH } from "@/constants/layout";

interface iPadPageProps {
  children: React.ReactNode;
  maxWidth?: number;
  style?: ViewStyle;
}

export function IPadPage({ children, maxWidth = FORM_MAX_WIDTH, style }: iPadPageProps) {
  const isTablet = useIsTablet();

  if (!isTablet) {
    return <View style={[styles.phone, style]}>{children}</View>;
  }

  return (
    <View style={styles.tabletOuter}>
      <View style={[styles.tabletInner, { maxWidth }, style]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  phone: {
    flex: 1,
  },
  tabletOuter: {
    flex: 1,
    alignItems: "center",
  },
  tabletInner: {
    width: "100%",
    flex: 1,
  },
});
