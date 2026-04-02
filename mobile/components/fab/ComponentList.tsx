/**
 * ComponentList — shows recipe components for an assembly.
 */
import { StyleSheet, View, Text } from "react-native";
import { Wrench } from "lucide-react-native";
import { Card } from "@/components/ui/Card";
import { colors } from "@/constants/colors";
import { type as typography } from "@/constants/typography";
import { spacing } from "@/constants/layout";
import type { RecipeComponent } from "@/lib/panel-specs";

interface ComponentListProps {
  components: RecipeComponent[];
  title?: string;
}

export function ComponentList({ components, title = "Components" }: ComponentListProps) {
  if (components.length === 0) return null;

  return (
    <Card>
      <View style={styles.header}>
        <Wrench size={16} color={colors.brandOrange} strokeWidth={2} />
        <Text style={styles.title}>{title}</Text>
      </View>
      {components.map((comp, i) => (
        <View key={i} style={styles.row}>
          <Text style={styles.name}>{comp.name}</Text>
          <Text style={styles.qty}>x{comp.qty}</Text>
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.md },
  title: { ...typography.cardTitle, color: colors.navy },
  row: {
    flexDirection: "row", justifyContent: "space-between", paddingVertical: spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "rgba(226,230,235,0.4)",
  },
  name: { ...typography.body, color: colors.textPrimary, flex: 1 },
  qty: { ...typography.subtitle, fontWeight: "700", color: colors.brandOrange, fontVariant: ["tabular-nums"] },
});
