/**
 * Inventory tab — placeholder, will be completed in Phase 4.
 */
import { StyleSheet, View } from "react-native";
import { Header } from "@/components/layout/Header";
import { colors } from "@/constants/colors";
import { Package } from "lucide-react-native";
import { EmptyState } from "@/components/shared/EmptyState";

export default function InventoryScreen() {
  return (
    <>
      <Header title="Inventory" />
      <View style={styles.container}>
        <EmptyState
          icon={<Package size={48} color={colors.textMuted} strokeWidth={1.2} />}
          title="Inventory"
          description="Product catalog coming in Phase 4"
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
