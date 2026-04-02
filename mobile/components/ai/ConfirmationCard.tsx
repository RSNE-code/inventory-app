/**
 * ConfirmationCard — AI match result with confidence, confirm/reject.
 */
import { StyleSheet, View, Text, Pressable } from "react-native";
import { Check, X, AlertTriangle } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { colors } from "@/constants/colors";
import { type as typography } from "@/constants/typography";
import { spacing, radius } from "@/constants/layout";

interface ConfirmationCardProps {
  productName: string;
  matchedName?: string;
  confidence: "high" | "medium" | "low";
  quantity: number;
  unit: string;
  onConfirm: () => void;
  onReject: () => void;
  onFix?: () => void;
}

const CONFIDENCE_CONFIG = {
  high: { variant: "green" as const, label: "High Match", accent: "green" as const },
  medium: { variant: "yellow" as const, label: "Review", accent: "yellow" as const },
  low: { variant: "red" as const, label: "Low Match", accent: "red" as const },
};

export function ConfirmationCard({
  productName, matchedName, confidence, quantity, unit, onConfirm, onReject, onFix,
}: ConfirmationCardProps) {
  const config = CONFIDENCE_CONFIG[confidence];

  return (
    <Card accent={config.accent}>
      <View style={styles.header}>
        <Text style={styles.name} numberOfLines={2}>{productName}</Text>
        <Badge label={config.label} variant={config.variant} />
      </View>
      {matchedName && matchedName !== productName && (
        <Text style={styles.matched}>Matched: {matchedName}</Text>
      )}
      <Text style={styles.qty}>{quantity} {unit}</Text>
      <View style={styles.actions}>
        <Pressable style={styles.confirmBtn} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onConfirm(); }}>
          <Check size={18} color={colors.textInverse} strokeWidth={2.5} />
          <Text style={styles.confirmText}>Confirm</Text>
        </Pressable>
        {onFix && (
          <Pressable style={styles.fixBtn} onPress={onFix}>
            <AlertTriangle size={16} color={colors.brandOrange} strokeWidth={2} />
            <Text style={styles.fixText}>Fix</Text>
          </Pressable>
        )}
        <Pressable style={styles.rejectBtn} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); onReject(); }}>
          <X size={18} color={colors.statusRed} strokeWidth={2} />
        </Pressable>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: spacing.sm },
  name: { ...typography.subtitle, fontWeight: "600", color: colors.navy, flex: 1 },
  matched: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },
  qty: { ...typography.body, color: colors.textSecondary, fontVariant: ["tabular-nums"], marginTop: spacing.sm },
  actions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  confirmBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.xs,
    backgroundColor: colors.statusGreen, borderRadius: radius.xl, paddingVertical: spacing.sm,
  },
  confirmText: { ...typography.caption, fontWeight: "700", color: colors.textInverse },
  fixBtn: {
    flexDirection: "row", alignItems: "center", gap: spacing.xs,
    borderWidth: 1.5, borderColor: colors.brandOrange, borderRadius: radius.xl,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  fixText: { ...typography.caption, fontWeight: "600", color: colors.brandOrange },
  rejectBtn: {
    width: 36, height: 36, borderRadius: radius.xl, borderWidth: 1.5, borderColor: colors.statusRedBg,
    alignItems: "center", justifyContent: "center",
  },
});
