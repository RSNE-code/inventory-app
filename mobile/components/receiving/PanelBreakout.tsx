/**
 * PanelBreakout — panel item breakdown view.
 */
import { StyleSheet, View, Text } from "react-native";
import { Layers } from "lucide-react-native";
import { Card } from "@/components/ui/Card";
import { colors } from "@/constants/colors";
import { type as typography } from "@/constants/typography";
import { spacing } from "@/constants/layout";

interface PanelBreakoutProps {
  brand: string;
  thickness: string;
  panels: { height: number; width: number; quantity: number }[];
}

export function PanelBreakout({ brand, thickness, panels }: PanelBreakoutProps) {
  return (
    <Card accent="blue">
      <View style={styles.header}>
        <Layers size={18} color={colors.brandBlue} strokeWidth={2} />
        <Text style={styles.title}>{brand} {thickness} Panels</Text>
      </View>
      {panels.map((p, i) => (
        <View key={i} style={styles.row}>
          <Text style={styles.dim}>{p.height}' x {p.width}"</Text>
          <Text style={styles.qty}>x{p.quantity}</Text>
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.md },
  title: { ...typography.cardTitle, color: colors.navy },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "rgba(226,230,235,0.4)" },
  dim: { ...typography.body, color: colors.textPrimary },
  qty: { ...typography.subtitle, fontWeight: "700", color: colors.brandBlue, fontVariant: ["tabular-nums"] },
});
