/**
 * InventoryTrendChart — placeholder for trend visualization.
 * Full SVG chart implementation will come in Phase 10 polish.
 * For now, shows a simple stat display.
 */
import { StyleSheet, View, Text } from "react-native";
import { TrendingUp } from "lucide-react-native";
import { Card } from "@/components/ui/Card";
import { colors } from "@/constants/colors";
import { type as typography } from "@/constants/typography";
import { spacing, radius } from "@/constants/layout";

export function InventoryTrendChart() {
  return (
    <Card>
      <View style={styles.header}>
        <View style={styles.iconBox}>
          <TrendingUp size={16} color={colors.brandBlue} strokeWidth={2} />
        </View>
        <Text style={styles.title}>Inventory Trend</Text>
      </View>
      <View style={styles.placeholder}>
        <Text style={styles.placeholderText}>
          Chart visualization coming in polish phase
        </Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: radius.xl,
    backgroundColor: colors.statusBlueBg,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    ...typography.cardTitle,
    color: colors.navy,
  },
  placeholder: {
    height: 120,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  placeholderText: {
    ...typography.caption,
    color: colors.textMuted,
  },
});
