/**
 * BOMs tab — placeholder, will be completed in Phase 6.
 */
import { StyleSheet, View } from "react-native";
import { Header } from "@/components/layout/Header";
import { colors } from "@/constants/colors";
import { ClipboardList } from "lucide-react-native";
import { EmptyState } from "@/components/shared/EmptyState";

export default function BomsScreen() {
  return (
    <>
      <Header title="BOMs" />
      <View style={styles.container}>
        <EmptyState
          icon={<ClipboardList size={48} color={colors.textMuted} strokeWidth={1.2} />}
          title="Bills of Materials"
          description="BOM management coming in Phase 6"
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
