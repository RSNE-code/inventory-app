/**
 * Settings screen — accessible from Dashboard hamburger menu.
 */
import { StyleSheet, View, Text, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { LogOut, Info, Users } from "lucide-react-native";
import { Header } from "@/components/layout/Header";
import { IPadPage } from "@/components/layout/iPadPage";
import { Card } from "@/components/ui/Card";
import { useAuth } from "@/lib/auth";
import { useResponsiveSpacing } from "@/lib/hooks/useDeviceType";
import { colors } from "@/constants/colors";
import { type as typography } from "@/constants/typography";
import { spacing, SETTINGS_MAX_WIDTH } from "@/constants/layout";

export default function SettingsScreen() {
  const { signOut, userName } = useAuth();
  const router = useRouter();
  const { screenPadding } = useResponsiveSpacing();

  return (
    <>
      <Header title="Settings" showBack />
      <View style={[styles.container, { padding: screenPadding }]}>
        <IPadPage maxWidth={SETTINGS_MAX_WIDTH}>
        <Card style={styles.card}>
          <Text style={styles.greeting}>Signed in as</Text>
          <Text style={styles.userName}>{userName}</Text>
        </Card>

        <Card style={styles.card} onPress={() => {}}>
          <View style={styles.menuRow}>
            <Users size={20} color={colors.textMuted} strokeWidth={1.8} />
            <Text style={styles.menuLabel}>User Management</Text>
            <Text style={styles.comingSoon}>Coming soon</Text>
          </View>
        </Card>

        <Card style={styles.card} onPress={() => {}}>
          <View style={styles.menuRow}>
            <Info size={20} color={colors.textMuted} strokeWidth={1.8} />
            <Text style={styles.menuLabel}>About</Text>
            <Text style={styles.version}>v1.0.0</Text>
          </View>
        </Card>

        <Pressable style={styles.signOutButton} onPress={signOut}>
          <LogOut size={20} color={colors.statusRed} strokeWidth={1.8} />
          <Text style={styles.signOutLabel}>Sign Out</Text>
        </Pressable>
        </IPadPage>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    gap: spacing.md,
  },
  card: {
    padding: spacing.lg,
  },
  greeting: {
    ...typography.caption,
    color: colors.textMuted,
  },
  userName: {
    ...typography.cardTitle,
    color: colors.textPrimary,
    marginTop: spacing.xs,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    minHeight: 48,
  },
  menuLabel: {
    ...typography.subtitle,
    color: colors.textPrimary,
    flex: 1,
  },
  comingSoon: {
    ...typography.caption,
    color: colors.textMuted,
  },
  version: {
    ...typography.caption,
    color: colors.textMuted,
  },
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    paddingVertical: spacing.lg,
    marginTop: spacing.lg,
  },
  signOutLabel: {
    ...typography.subtitle,
    color: colors.statusRed,
    fontWeight: "600",
  },
});
