/**
 * Edit product screen.
 */
import { useState, useEffect } from "react";
import { StyleSheet, ScrollView, View, Alert, KeyboardAvoidingView, Platform } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Header } from "@/components/layout/Header";
import { IPadPage } from "@/components/layout/iPadPage";
import { ProductForm, EMPTY_FORM } from "@/components/inventory/ProductForm";
import type { ProductFormData } from "@/components/inventory/ProductForm";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/shared/LoadingState";
import { useProduct, useUpdateProduct } from "@/hooks/use-products";
import { useResponsiveSpacing } from "@/lib/hooks/useDeviceType";
import { colors } from "@/constants/colors";
import { spacing } from "@/constants/layout";

export default function EditProductScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data, isLoading } = useProduct(id!);
  const updateMutation = useUpdateProduct();
  const { screenPadding } = useResponsiveSpacing();

  const product = (data as any)?.data ?? data;
  const p = product as Record<string, any> | undefined;

  const [form, setForm] = useState<ProductFormData>({ ...EMPTY_FORM });

  useEffect(() => {
    if (p) {
      setForm({
        ...EMPTY_FORM,
        name: String(p.name ?? ""),
        sku: String(p.sku ?? ""),
        categoryId: String(p.categoryId ?? ""),
        tier: String(p.tier ?? "1"),
        unitOfMeasure: String(p.unitOfMeasure ?? p.unit ?? "EA"),
        shopUnit: String(p.shopUnit ?? ""),
        currentQty: String(p.currentQty ?? "0"),
        reorderPoint: String(p.reorderPoint ?? "0"),
        leadTimeDays: String(p.leadTimeDays ?? ""),
        location: String(p.location ?? ""),
        unitCost: String(p.unitCost ?? ""),
        notes: String(p.notes ?? ""),
        dimLength: String(p.dimLength ?? ""),
        dimLengthUnit: String(p.dimLengthUnit ?? "in"),
        dimWidth: String(p.dimWidth ?? ""),
        dimWidthUnit: String(p.dimWidthUnit ?? "in"),
        dimThickness: String(p.dimThickness ?? ""),
        dimThicknessUnit: String(p.dimThicknessUnit ?? "in"),
      });
    }
  }, [p]);

  if (isLoading) return (<><Header title="Edit Product" showBack /><LoadingState fullScreen /></>);

  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync({
        id: id!,
        name: form.name,
        sku: form.sku || undefined,
        unitOfMeasure: form.unitOfMeasure,
        reorderPoint: parseFloat(form.reorderPoint) || 0,
        location: form.location || undefined,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch { Alert.alert("Error", "Failed to save changes"); }
  };

  return (
    <>
      <Header title="Edit Product" showBack />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.flex}>
        <ScrollView style={styles.container} contentContainerStyle={{ padding: screenPadding, paddingBottom: insets.bottom + 100 }}>
          <IPadPage>
            <ProductForm data={form} onChange={setForm} />
            <Button
              title={updateMutation.isPending ? "Saving\u2026" : "Save Changes"}
              onPress={handleSave}
              disabled={!form.name.trim() || updateMutation.isPending}
              loading={updateMutation.isPending}
              size="lg"
              style={styles.saveBtn}
            />
          </IPadPage>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: colors.background },
  saveBtn: { marginTop: spacing["2xl"] },
});
