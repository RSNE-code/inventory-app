/**
 * PanelCheckoutSheet — panel-specific checkout with dimensions.
 */
import { useState } from "react";
import { StyleSheet, View, Text } from "react-native";
import { Sheet } from "@/components/ui/Sheet";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { colors } from "@/constants/colors";
import { type as typography } from "@/constants/typography";
import { spacing } from "@/constants/layout";

interface PanelCheckoutSheetProps {
  visible: boolean;
  onClose: () => void;
  productName: string;
  onCheckout: (length: number, width: number, qty: number) => void;
  loading?: boolean;
}

export function PanelCheckoutSheet({ visible, onClose, productName, onCheckout, loading }: PanelCheckoutSheetProps) {
  const [length, setLength] = useState("");
  const [width, setWidth] = useState("");
  const [qty, setQty] = useState("1");

  return (
    <Sheet visible={visible} onClose={onClose} title="Panel Checkout">
      <Text style={styles.name}>{productName}</Text>
      <View style={styles.form}>
        <View style={styles.row}>
          <Input label="Length (ft)" value={length} onChangeText={setLength} keyboardType="decimal-pad" style={styles.half} />
          <Input label="Width (in)" value={width} onChangeText={setWidth} keyboardType="decimal-pad" style={styles.half} />
        </View>
        <Input label="Quantity" value={qty} onChangeText={setQty} keyboardType="number-pad" />
        <Button
          title={loading ? "Checking out\u2026" : "Checkout Panel"}
          onPress={() => onCheckout(parseFloat(length) || 0, parseFloat(width) || 0, parseInt(qty) || 1)}
          disabled={!length || !width}
          loading={loading}
          size="lg"
        />
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  name: { ...typography.cardTitle, color: colors.navy, marginBottom: spacing.md },
  form: { gap: spacing.lg },
  row: { flexDirection: "row", gap: spacing.md },
  half: { flex: 1 },
});
