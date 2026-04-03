/**
 * Create BOM template screen.
 */
import { useState } from "react";
import { StyleSheet, ScrollView, View, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Header } from "@/components/layout/Header";
import { IPadPage } from "@/components/layout/iPadPage";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { BomQuickPick } from "@/components/bom/BomQuickPick";
import { useCreateBomTemplate } from "@/hooks/use-bom-templates";
import { useResponsiveSpacing } from "@/lib/hooks/useDeviceType";
import { colors } from "@/constants/colors";
import { spacing } from "@/constants/layout";

export default function NewBomTemplateScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const createMutation = useCreateBomTemplate();
  const { screenPadding } = useResponsiveSpacing();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [items, setItems] = useState<{ productId: string; productName: string; quantity: number; unit: string }[]>([]);

  const handleCreate = async () => {
    if (!name.trim()) return;
    try {
      await createMutation.mutateAsync({
        name: name.trim(), description: description || undefined,
        lineItems: items.map((i) => ({ productId: i.productId, defaultQty: i.quantity, unitOfMeasure: i.unit })),
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch { Alert.alert("Error", "Failed to create template"); }
  };

  return (
    <>
      <Header title="New Template" showBack />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.flex}>
        <ScrollView style={styles.container} contentContainerStyle={{ padding: screenPadding, paddingBottom: insets.bottom + 100 }}>
          <IPadPage>
            <Input label="Template Name *" value={name} onChangeText={setName} placeholder="e.g. Standard Kitchen BOM" />
            <Input label="Description" value={description} onChangeText={setDescription} placeholder="Optional" multiline style={styles.gap} />
            <BomQuickPick items={items} onItemsChange={setItems} />
            <Button title={createMutation.isPending ? "Creating\u2026" : "Create Template"} onPress={handleCreate}
              disabled={!name.trim() || createMutation.isPending} loading={createMutation.isPending} size="lg" style={styles.btn} />
          </IPadPage>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: colors.background },
  gap: { marginTop: spacing.lg },
  btn: { marginTop: spacing["2xl"] },
});
