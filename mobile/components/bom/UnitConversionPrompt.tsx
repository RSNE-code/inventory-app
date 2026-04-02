/**
 * UnitConversionPrompt — prompt when unit mismatch is detected.
 */
import { StyleSheet, View, Text } from "react-native";
import { ArrowRight } from "lucide-react-native";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { colors } from "@/constants/colors";
import { type as typography } from "@/constants/typography";
import { spacing, radius } from "@/constants/layout";

interface UnitConversionPromptProps {
  fromUnit: string;
  toUnit: string;
  productName: string;
  onConvert: () => void;
  onKeepOriginal: () => void;
}

export function UnitConversionPrompt({ fromUnit, toUnit, productName, onConvert, onKeepOriginal }: UnitConversionPromptProps) {
  return (
    <Card accent="yellow">
      <Text style={styles.title}>Unit Mismatch</Text>
      <Text style={styles.product}>{productName}</Text>
      <View style={styles.convRow}>
        <View style={styles.unitBadge}><Text style={styles.unitText}>{fromUnit}</Text></View>
        <ArrowRight size={16} color={colors.textMuted} strokeWidth={2} />
        <View style={[styles.unitBadge, styles.unitBadgeTo]}><Text style={[styles.unitText, styles.unitTextTo]}>{toUnit}</Text></View>
      </View>
      <View style={styles.actions}>
        <Button title={`Convert to ${toUnit}`} onPress={onConvert} size="sm" />
        <Button title={`Keep ${fromUnit}`} variant="ghost" onPress={onKeepOriginal} size="sm" />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  title: { ...typography.cardTitle, color: colors.navy, marginBottom: spacing.xs },
  product: { ...typography.body, color: colors.textMuted },
  convRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginVertical: spacing.md },
  unitBadge: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.full, backgroundColor: colors.surfaceSecondary },
  unitBadgeTo: { backgroundColor: colors.statusBlueBg },
  unitText: { ...typography.subtitle, fontWeight: "700", color: colors.textSecondary },
  unitTextTo: { color: colors.brandBlue },
  actions: { flexDirection: "row", gap: spacing.sm },
});
