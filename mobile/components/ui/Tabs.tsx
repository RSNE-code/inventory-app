/**
 * Tabs — segmented control matching web's rounded-xl surface-secondary pattern.
 * Active tab has white pill with shadow.
 */
import { StyleSheet, View, Text, Pressable } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from "react-native-reanimated";
import { useEffect } from "react";
import * as Haptics from "expo-haptics";
import { colors } from "@/constants/colors";
import { type as typography } from "@/constants/typography";
import { spacing, radius } from "@/constants/layout";
import { shadowBrand } from "@/constants/shadows";
import { SPRING_SNAPPY } from "@/constants/animations";

interface Tab {
  key: string;
  label: string;
}

interface TabsProps {
  tabs: Tab[];
  activeKey: string;
  onTabChange: (key: string) => void;
}

export function Tabs({ tabs, activeKey, onTabChange }: TabsProps) {
  const activeIndex = tabs.findIndex((t) => t.key === activeKey);
  const indicatorX = useSharedValue(0);
  const tabWidth = 100 / tabs.length;

  useEffect(() => {
    indicatorX.value = withSpring(activeIndex * tabWidth, SPRING_SNAPPY);
  }, [activeIndex, tabWidth]);

  const indicatorStyle = useAnimatedStyle(() => ({
    left: `${indicatorX.value}%` as unknown as number,
    width: `${tabWidth}%` as unknown as number,
  }));

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.indicator, indicatorStyle]} />
      {tabs.map((tab) => {
        const isActive = tab.key === activeKey;
        return (
          <Pressable
            key={tab.key}
            onPress={() => {
              if (!isActive) {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                onTabChange(tab.key);
              }
            }}
            style={styles.tab}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
          >
            <Text style={[styles.tabLabel, isActive && styles.tabLabelActive]}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.xl,
    padding: 4,
    position: "relative",
  },
  indicator: {
    position: "absolute",
    top: 4,
    bottom: 4,
    backgroundColor: colors.background,
    borderRadius: radius.lg,
    ...shadowBrand,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.sm,
    zIndex: 1,
  },
  tabLabel: {
    ...typography.subtitle,
    color: colors.textMuted,
  },
  tabLabelActive: {
    color: colors.textPrimary,
    fontWeight: "600",
  },
});
