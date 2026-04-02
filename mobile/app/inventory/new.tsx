/**
 * Create product screen — form with all product fields.
 */
import { useState } from "react";
import {
  StyleSheet,
  ScrollView,
  View,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Header } from "@/components/layout/Header";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useCreateProduct } from "@/hooks/use-products";
import { colors } from "@/constants/colors";
import { spacing } from "@/constants/layout";

export default function NewProductScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const createMutation = useCreateProduct();

  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [unit, setUnit] = useState("EA");
  const [qty, setQty] = useState("0");
  const [reorder, setReorder] = useState("0");
  const [location, setLocation] = useState("");
  const [cost, setCost] = useState("");

  const canSubmit = name.trim().length > 0;

  const handleCreate = async () => {
    if (!canSubmit) return;
    try {
      await createMutation.mutateAsync({
        name: name.trim(),
        sku: sku || undefined,
        unitOfMeasure: unit,
        currentQty: parseFloat(qty) || 0,
        reorderPoint: parseFloat(reorder) || 0,
        location: location || undefined,
        unitCost: parseFloat(cost) || undefined,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Failed to create product");
    }
  };

  return (
    <>
      <Header title="New Product" showBack />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
        >
          <View style={styles.form}>
            <Input label="Product Name *" value={name} onChangeText={setName} placeholder="e.g. 3/4 Plywood" autoCapitalize="words" />
            <Input label="SKU" value={sku} onChangeText={setSku} placeholder="Optional" autoCapitalize="characters" />
            <Input label="Unit of Measure" value={unit} onChangeText={setUnit} placeholder="EA, LF, SF, etc." autoCapitalize="characters" />
            <View style={styles.row}>
              <Input label="Current Qty" value={qty} onChangeText={setQty} keyboardType="decimal-pad" style={styles.halfInput} />
              <Input label="Reorder Point" value={reorder} onChangeText={setReorder} keyboardType="decimal-pad" style={styles.halfInput} />
            </View>
            <Input label="Location" value={location} onChangeText={setLocation} placeholder="e.g. Warehouse A, Bay 3" />
            <Input label="Unit Cost ($)" value={cost} onChangeText={setCost} keyboardType="decimal-pad" placeholder="0.00" />
            <Button
              title={createMutation.isPending ? "Creating\u2026" : "Create Product"}
              onPress={handleCreate}
              disabled={!canSubmit}
              loading={createMutation.isPending}
              size="lg"
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  form: {
    gap: spacing.xl,
  },
  row: {
    flexDirection: "row",
    gap: spacing.md,
  },
  halfInput: {
    flex: 1,
  },
});
