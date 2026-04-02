/**
 * Cycle Counts screen — accessible from Dashboard hamburger menu.
 * Placeholder, will be completed in Phase 8.
 */
import { StyleSheet, View } from "react-native";
import { Header } from "@/components/layout/Header";
import { colors } from "@/constants/colors";
import { ClipboardCheck } from "lucide-react-native";
import { EmptyState } from "@/components/shared/EmptyState";

export default function CycleCountsScreen() {
  return (
    <>
      <Header title="Cycle Counts" showBack />
      <View style={styles.container}>
        <EmptyState
          icon={<ClipboardCheck size={48} color={colors.textMuted} strokeWidth={1.2} />}
          title="Cycle Counts"
          description="Count and variance tracking coming in Phase 8"
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
});
