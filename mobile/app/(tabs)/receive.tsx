/**
 * Receive tab — placeholder, will be completed in Phase 5.
 */
import { StyleSheet, View, Text } from "react-native";
import { Header } from "@/components/layout/Header";
import { colors } from "@/constants/colors";
import { type as typography } from "@/constants/typography";
import { spacing } from "@/constants/layout";
import { PackageCheck } from "lucide-react-native";
import { EmptyState } from "@/components/shared/EmptyState";

export default function ReceiveScreen() {
  return (
    <>
      <Header title="Receive Material" />
      <View style={styles.container}>
        <EmptyState
          icon={<PackageCheck size={48} color={colors.textMuted} strokeWidth={1.2} />}
          title="Receiving"
          description="AI-powered receiving flow coming in Phase 5"
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
