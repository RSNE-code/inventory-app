/**
 * FabGateSection — fabrication gate check for BOM approval.
 */
import { StyleSheet, View, Text } from "react-native";
import { AlertTriangle, Factory } from "lucide-react-native";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { colors } from "@/constants/colors";
import { type as typography } from "@/constants/typography";
import { spacing, radius } from "@/constants/layout";

interface FabGateSectionProps {
  unfabricatedCount: number;
  assemblyNames: string[];
}

export function FabGateSection({ unfabricatedCount, assemblyNames }: FabGateSectionProps) {
  if (unfabricatedCount === 0) return null;
  return (
    <Card accent="orange" style={styles.card}>
      <View style={styles.header}>
        <Factory size={18} color={colors.brandOrange} strokeWidth={2} />
        <Text style={styles.title}>Fabrication Required</Text>
        <Badge label={`${unfabricatedCount}`} variant="orange" showDot={false} />
      </View>
      <Text style={styles.description}>
        {unfabricatedCount} assembly item{unfabricatedCount !== 1 ? "s" : ""} need fab orders before this BOM can be approved.
      </Text>
      {assemblyNames.map((name, i) => (
        <View key={i} style={styles.itemRow}>
          <AlertTriangle size={14} color={colors.brandOrange} strokeWidth={2} />
          <Text style={styles.itemName}>{name}</Text>
        </View>
      ))}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: "rgba(232, 121, 43, 0.04)" },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm },
  title: { ...typography.cardTitle, color: colors.navy, flex: 1 },
  description: { ...typography.body, color: colors.textSecondary, marginBottom: spacing.md },
  itemRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: spacing.xs },
  itemName: { ...typography.subtitle, fontWeight: "500", color: colors.brandOrange },
});
