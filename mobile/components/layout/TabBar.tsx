/**
 * Custom animated tab bar — matches web's bottom-nav.tsx.
 * Sliding pill indicator, active dot, icon scale, frosted glass, haptics.
 */
import { useEffect } from "react";
import { StyleSheet, View, Text, Pressable, Platform } from "react-native";
import { type BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  FadeIn,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import {
  LayoutDashboard,
  PackageCheck,
  Package,
  ClipboardList,
  Factory,
} from "lucide-react-native";
import { colors } from "@/constants/colors";
import { type as typography } from "@/constants/typography";
import { spacing, radius, TAB_BAR_HEIGHT } from "@/constants/layout";
import { SPRING_SNAPPY } from "@/constants/animations";

const TAB_ICONS = [LayoutDashboard, PackageCheck, Package, ClipboardList, Factory];

export function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const indicatorX = useSharedValue(0);
  const tabCount = state.routes.length;

  useEffect(() => {
    indicatorX.value = withSpring(state.index, SPRING_SNAPPY);
  }, [state.index]);

  const indicatorStyle = useAnimatedStyle(() => {
    const tabWidth = 100 / tabCount;
    return {
      left: `${indicatorX.value * tabWidth}%` as unknown as number,
      width: `${tabWidth}%` as unknown as number,
    };
  });

  return (
    <View
      style={[
        styles.container,
        { paddingBottom: Math.max(insets.bottom, spacing.sm) },
      ]}
    >
      {/* Sliding pill indicator */}
      <Animated.View style={[styles.indicator, indicatorStyle]} />

      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label = options.title ?? route.name;
        const isFocused = state.index === index;
        const Icon = TAB_ICONS[index];

        const onPress = () => {
          const event = navigation.emit({
            type: "tabPress",
            target: route.key,
            canPreventDefault: true,
          });

          if (!isFocused && !event.defaultPrevented) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            navigation.navigate(route.name);
          }
        };

        return (
          <Pressable
            key={route.key}
            onPress={onPress}
            accessibilityRole="tab"
            accessibilityState={{ selected: isFocused }}
            accessibilityLabel={options.tabBarAccessibilityLabel}
            style={styles.tab}
          >
            <Animated.View
              style={[
                styles.iconWrap,
                isFocused && styles.iconWrapActive,
              ]}
            >
              <Icon
                size={22}
                color={isFocused ? colors.tabActive : colors.tabInactive}
                strokeWidth={1.8}
              />
            </Animated.View>
            <Text
              style={[
                styles.label,
                isFocused && styles.labelActive,
              ]}
            >
              {label}
            </Text>
            {isFocused && (
              <Animated.View
                entering={FadeIn.duration(200)}
                style={styles.dot}
              />
            )}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.tabBarBorder,
    paddingTop: spacing.sm,
    position: "relative",
    // Frosted glass feel via near-opaque white bg
  },
  indicator: {
    position: "absolute",
    top: 4,
    height: TAB_BAR_HEIGHT - 8,
    backgroundColor: colors.overlayLight,
    borderRadius: radius.xl,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    gap: 2,
    paddingVertical: spacing.sm,
    zIndex: 1,
  },
  iconWrap: {
    padding: 2,
  },
  iconWrapActive: {
    transform: [{ scale: 1.1 }],
  },
  label: {
    ...typography.tabLabel,
    color: colors.tabInactive,
  },
  labelActive: {
    color: colors.tabActive,
    fontWeight: "700",
  },
  dot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.tabActive,
    marginTop: 1,
  },
});
