/**
 * MatchCorrectionSheet — correct product matches in bottom sheet.
 */
import { StyleSheet, View, Text } from "react-native";
import { Sheet } from "@/components/ui/Sheet";
import { SearchInput } from "@/components/ui/SearchInput";
import { ProductPicker } from "./ProductPicker";
import { useState } from "react";
import { colors } from "@/constants/colors";
import { type as typography } from "@/constants/typography";
import { spacing } from "@/constants/layout";
import type { Product } from "@/types/api";

interface MatchCorrectionSheetProps {
  visible: boolean;
  onClose: () => void;
  originalName: string;
  onSelect: (product: Product) => void;
}

export function MatchCorrectionSheet({ visible, onClose, originalName, onSelect }: MatchCorrectionSheetProps) {
  return (
    <Sheet visible={visible} onClose={onClose} title="Correct Match">
      <Text style={styles.original}>Original: <Text style={styles.bold}>{originalName}</Text></Text>
      <Text style={styles.hint}>Search for the correct product below</Text>
      <ProductPicker visible={true} onClose={onClose} onSelect={(p) => { onSelect(p); onClose(); }} />
    </Sheet>
  );
}

const styles = StyleSheet.create({
  original: { ...typography.body, color: colors.textMuted, marginBottom: spacing.xs },
  bold: { fontWeight: "600", color: colors.navy },
  hint: { ...typography.caption, color: colors.textMuted, marginBottom: spacing.md },
});
