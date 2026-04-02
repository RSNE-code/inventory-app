/**
 * Assemblies tab — placeholder, will be completed in Phase 7.
 */
import { StyleSheet, View } from "react-native";
import { Header } from "@/components/layout/Header";
import { colors } from "@/constants/colors";
import { Factory } from "lucide-react-native";
import { EmptyState } from "@/components/shared/EmptyState";

export default function AssembliesScreen() {
  return (
    <>
      <Header title="Assemblies" />
      <View style={styles.container}>
        <EmptyState
          icon={<Factory size={48} color={colors.textMuted} strokeWidth={1.2} />}
          title="Assemblies"
          description="Door & panel workflows coming in Phase 7"
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
