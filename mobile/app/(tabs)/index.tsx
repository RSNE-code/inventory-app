/**
 * Dashboard tab — placeholder, will be completed in Phase 3.
 */
import { StyleSheet, ScrollView, Text } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Header } from "@/components/layout/Header";
import { colors } from "@/constants/colors";
import { type as typography } from "@/constants/typography";
import { spacing } from "@/constants/layout";
import { getGreeting } from "@/lib/utils";
import { useAuth } from "@/lib/auth";

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const { userName } = useAuth();

  return (
    <>
      <Header title={`${getGreeting()}, ${userName}`} showMenu />
      <ScrollView
        style={styles.container}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + 100 },
        ]}
      >
        <Text style={styles.placeholder}>Dashboard widgets coming in Phase 3</Text>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
  },
  placeholder: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: "center",
    marginTop: spacing["4xl"],
  },
});
