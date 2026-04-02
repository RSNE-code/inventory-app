/**
 * SplitView — master-detail layout for iPad (38/62 split).
 * On iPhone, renders only children (master or detail via navigation).
 */
import { StyleSheet, View, type ViewStyle } from "react-native";
import { useIsTablet } from "@/lib/hooks/useDeviceType";
import { colors } from "@/constants/colors";
import { SPLIT_VIEW } from "@/constants/layout";

interface SplitViewProps {
  master: React.ReactNode;
  detail: React.ReactNode;
  /** Show detail on phone (false = show master only on phone) */
  showDetail?: boolean;
  style?: ViewStyle;
}

export function SplitView({ master, detail, showDetail = false, style }: SplitViewProps) {
  const isTablet = useIsTablet();

  if (!isTablet) {
    return <View style={[styles.phone, style]}>{showDetail ? detail : master}</View>;
  }

  return (
    <View style={[styles.container, style]}>
      <View style={styles.master}>{master}</View>
      <View style={styles.divider} />
      <View style={styles.detail}>{detail}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  phone: {
    flex: 1,
  },
  container: {
    flex: 1,
    flexDirection: "row",
  },
  master: {
    flex: SPLIT_VIEW.masterRatio,
  },
  divider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  detail: {
    flex: SPLIT_VIEW.detailRatio,
  },
});
