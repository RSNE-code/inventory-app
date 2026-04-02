/**
 * POMatchCard — shows AI-matched PO with confidence score.
 */
import { StyleSheet, View, Text } from "react-native";
import { FileText, Check } from "lucide-react-native";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { colors } from "@/constants/colors";
import { type as typography } from "@/constants/typography";
import { spacing, radius } from "@/constants/layout";

interface POMatchCardProps {
  poNumber: string;
  supplierName: string;
  confidence: number;
  onAccept: () => void;
  onReject: () => void;
}

export function POMatchCard({ poNumber, supplierName, confidence, onAccept, onReject }: POMatchCardProps) {
  const variant = confidence >= 0.8 ? "green" : confidence >= 0.5 ? "yellow" : "red";
  return (
    <Card accent="blue">
      <View style={styles.header}>
        <FileText size={20} color={colors.brandBlue} strokeWidth={1.8} />
        <Text style={styles.title}>PO Match Found</Text>
        <Badge label={`${Math.round(confidence * 100)}%`} variant={variant} showDot={false} />
      </View>
      <Text style={styles.poNumber}>PO #{poNumber}</Text>
      <Text style={styles.supplier}>{supplierName}</Text>
      <View style={styles.actions}>
        <Button title="Use This PO" icon={<Check size={16} color={colors.textInverse} strokeWidth={2} />} onPress={onAccept} size="sm" />
        <Button title="Skip" variant="ghost" onPress={onReject} size="sm" />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm },
  title: { ...typography.cardTitle, color: colors.navy, flex: 1 },
  poNumber: { ...typography.sectionTitle, color: colors.navy, fontVariant: ["tabular-nums"] },
  supplier: { ...typography.body, color: colors.textMuted, marginTop: spacing.xs },
  actions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.lg },
});
