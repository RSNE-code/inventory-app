/**
 * Header — page title bar with optional back button and menu.
 * Matches web's navy header with logo pill and hamburger menu.
 */
import { useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  Image,
  Pressable,
  Modal,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  ArrowLeft,
  Menu,
  X,
  ClipboardCheck,
  Settings,
} from "lucide-react-native";
import Animated, { FadeIn, FadeOut } from "react-native-reanimated";
import { colors } from "@/constants/colors";
import { type as typography } from "@/constants/typography";
import { spacing, radius, HEADER_HEIGHT } from "@/constants/layout";
import { shadowBrandMd } from "@/constants/shadows";

interface HeaderProps {
  title: string;
  showBack?: boolean;
  showMenu?: boolean;
  action?: React.ReactNode;
}

export function Header({ title, showBack, showMenu, action }: HeaderProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <View style={[styles.header, { paddingTop: insets.top }]}>
      <View style={styles.row}>
        {showBack && (
          <Pressable
            onPress={() => router.back()}
            style={styles.iconButton}
            accessibilityLabel="Go back"
          >
            <ArrowLeft size={22} color="rgba(255,255,255,0.8)" strokeWidth={2} />
          </Pressable>
        )}

        {/* Logo */}
        <Image
          source={require("../../assets/logo.png")}
          style={styles.logoImage}
          resizeMode="contain"
        />

        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>

        {action}

        {showMenu && (
          <Pressable
            onPress={() => setMenuOpen(true)}
            style={styles.iconButton}
            accessibilityLabel="Open menu"
          >
            <Menu size={22} color="rgba(255,255,255,0.7)" strokeWidth={2} />
          </Pressable>
        )}
      </View>

      {/* Dropdown menu */}
      <Modal
        visible={menuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuOpen(false)}
      >
        <Pressable style={styles.menuOverlay} onPress={() => setMenuOpen(false)}>
          <Animated.View
            entering={FadeIn.duration(150)}
            exiting={FadeOut.duration(100)}
            style={[styles.menuCard, { top: insets.top + HEADER_HEIGHT + spacing.sm, right: spacing.lg }]}
          >
            <Pressable
              style={styles.menuItem}
              onPress={() => {
                setMenuOpen(false);
                router.push("/cycle-counts");
              }}
            >
              <ClipboardCheck size={18} color={colors.textMuted} strokeWidth={2} />
              <Text style={styles.menuLabel}>Cycle Counts</Text>
            </Pressable>
            <Pressable
              style={styles.menuItem}
              onPress={() => {
                setMenuOpen(false);
                router.push("/settings");
              }}
            >
              <Settings size={18} color={colors.textMuted} strokeWidth={2} />
              <Text style={styles.menuLabel}>Settings</Text>
            </Pressable>
          </Animated.View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.navy,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  row: {
    height: HEADER_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  iconButton: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.xl,
  },
  logoImage: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
  },
  title: {
    flex: 1,
    ...typography.sectionTitle,
    color: colors.textInverse,
    letterSpacing: -0.3,
  },
  menuOverlay: {
    flex: 1,
  },
  menuCard: {
    position: "absolute",
    width: 200,
    backgroundColor: colors.card,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 4,
    ...shadowBrandMd,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  menuLabel: {
    ...typography.subtitle,
    color: colors.navy,
  },
});
