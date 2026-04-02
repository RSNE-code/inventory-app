/**
 * FlaggedItemResolver — resolve low-confidence AI matches.
 */
import { StyleSheet, View, Text } from "react-native";
import { AlertTriangle } from "lucide-react-native";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ProductPicker } from "./ProductPicker";
import { useState } from "react";
import { colors } from "@/constants/colors";
import { type as typography } from "@/constants/typography";
import { spacing } from "@/constants/layout";
import type { Product } from "@/types/api";

interface FlaggedItemResolverProps {
  rawText: string;
  suggestedName?: string;
  onResolve: (product: Product) => void;
  onKeepAsWritten: () => void;
  onRemove: () => void;
}

export function FlaggedItemResolver({ rawText, suggestedName, onResolve, onKeepAsWritten, onRemove }: FlaggedItemResolverProps) {
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <Card accent="orange" style={styles.card}>
      <View style={styles.header}>
        <AlertTriangle size={18} color={colors.brandOrange} strokeWidth={2} />
        <Text style={styles.title}>Needs Review</Text>
      </View>
      <Text style={styles.rawText}>{rawText}</Text>
      {suggestedName && <Text style={styles.suggested}>Suggested: {suggestedName}</Text>}
      <View style={styles.actions}>
        <Button title="Find Match" variant="secondary" onPress={() => setPickerOpen(true)} size="sm" />
        <Button title="Keep as Written" variant="ghost" onPress={onKeepAsWritten} size="sm" />
        <Button title="Remove" variant="ghost" onPress={onRemove} size="sm" />
      </View>
      <ProductPicker visible={pickerOpen} onClose={() => setPickerOpen(false)} onSelect={onResolve} />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: "rgba(232, 121, 43, 0.04)" },
  header: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.sm },
  title: { ...typography.cardTitle, color: colors.brandOrange },
  rawText: { ...typography.subtitle, fontWeight: "600", color: colors.navy },
  suggested: { ...typography.caption, color: colors.textMuted, marginTop: spacing.xs },
  actions: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md, flexWrap: "wrap" },
});
