/**
 * ReceivingConfirmationCard — confirmation display for received items.
 */
import { StyleSheet, View, Text, Pressable } from "react-native";
import { Check, X, Edit3 } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { colors } from "@/constants/colors";
import { type as typography } from "@/constants/typography";
import { spacing, radius } from "@/constants/layout";
import { formatQuantity, formatCurrency } from "@/lib/utils";

interface ReceivingConfirmationCardProps {
  productName: string;
  matchedProductName?: string;
  quantity: number;
  unitCost: number;
  unit: string;
  isConfirmed: boolean;
  onConfirm: () => void;
  onReject: () => void;
  onEdit?: () => void;
}

export function ReceivingConfirmationCard({
  productName, matchedProductName, quantity, unitCost, unit,
  isConfirmed, onConfirm, onReject, onEdit,
}: ReceivingConfirmationCardProps) {
  return (
    <Card accent={isConfirmed ? "green" : "blue"} style={isConfirmed ? styles.confirmed : undefined}>
      <Text style={styles.name}>{productName}</Text>
      {matchedProductName && matchedProductName !== productName && (
        <Text style={styles.matched}>→ {matchedProductName}</Text>
      )}
      <View style={styles.detailRow}>
        <Text style={styles.detail}>{formatQuantity(quantity)} {unit}</Text>
        <Text style={styles.detail}>{formatCurrency(unitCost)} ea</Text>
        <Text style={styles.total}>{formatCurrency(quantity * unitCost)}</Text>
      </View>
      {!isConfirmed && (
        <View style={styles.actions}>
          <Pressable style={styles.confirmBtn} onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onConfirm(); }}>
            <Check size={16} color={colors.textInverse} strokeWidth={2.5} />
          </Pressable>
          {onEdit && (
            <Pressable style={styles.editBtn} onPress={onEdit}>
              <Edit3 size={16} color={colors.brandBlue} strokeWidth={2} />
            </Pressable>
          )}
          <Pressable style={styles.rejectBtn} onPress={onReject}>
            <X size={16} color={colors.statusRed} strokeWidth={2} />
          </Pressable>
        </View>
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  confirmed: { opacity: 0.7 },
  name: { ...typography.subtitle, fontWeight: "600", color: colors.navy },
  matched: { ...typography.caption, color: colors.brandBlue, marginTop: 2 },
  detailRow: { flexDirection: "row", gap: spacing.lg, marginTop: spacing.sm },
  detail: { ...typography.caption, color: colors.textMuted, fontVariant: ["tabular-nums"] },
  total: { ...typography.caption, fontWeight: "700", color: colors.navy, fontVariant: ["tabular-nums"] },
  actions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  confirmBtn: { width: 36, height: 36, borderRadius: radius.xl, backgroundColor: colors.statusGreen, alignItems: "center", justifyContent: "center" },
  editBtn: { width: 36, height: 36, borderRadius: radius.xl, borderWidth: 1.5, borderColor: colors.brandBlue, alignItems: "center", justifyContent: "center" },
  rejectBtn: { width: 36, height: 36, borderRadius: radius.xl, borderWidth: 1.5, borderColor: colors.statusRedBg, alignItems: "center", justifyContent: "center" },
});
