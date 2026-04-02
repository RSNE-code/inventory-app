/**
 * ProductForm — reusable create/edit product form.
 */
import { StyleSheet, View } from "react-native";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useCategories } from "@/hooks/use-products";
import { spacing } from "@/constants/layout";

interface ProductFormData {
  name: string; sku: string; categoryId: string; unitOfMeasure: string;
  currentQty: string; reorderPoint: string; location: string; unitCost: string;
  notes: string;
}

interface ProductFormProps {
  data: ProductFormData;
  onChange: (data: ProductFormData) => void;
}

export function ProductForm({ data, onChange }: ProductFormProps) {
  const { data: catData } = useCategories();
  const categories = (catData as any)?.data ?? [];
  const catOptions = categories.map((c: any) => ({ label: c.name, value: c.id }));

  const update = (field: keyof ProductFormData, value: string) => onChange({ ...data, [field]: value });

  return (
    <View style={styles.form}>
      <Input label="Product Name *" value={data.name} onChangeText={(v) => update("name", v)} placeholder="e.g. 3/4 Plywood" autoCapitalize="words" />
      <Input label="SKU" value={data.sku} onChangeText={(v) => update("sku", v)} placeholder="Optional" autoCapitalize="characters" />
      {catOptions.length > 0 && (
        <Select label="Category" value={data.categoryId} onValueChange={(v) => update("categoryId", v)} options={catOptions} placeholder="Select category" />
      )}
      <Input label="Unit of Measure" value={data.unitOfMeasure} onChangeText={(v) => update("unitOfMeasure", v)} placeholder="EA, LF, SF, etc." autoCapitalize="characters" />
      <View style={styles.row}>
        <Input label="Current Qty" value={data.currentQty} onChangeText={(v) => update("currentQty", v)} keyboardType="decimal-pad" style={styles.half} />
        <Input label="Reorder Point" value={data.reorderPoint} onChangeText={(v) => update("reorderPoint", v)} keyboardType="decimal-pad" style={styles.half} />
      </View>
      <Input label="Location" value={data.location} onChangeText={(v) => update("location", v)} placeholder="e.g. Warehouse A, Bay 3" />
      <Input label="Unit Cost ($)" value={data.unitCost} onChangeText={(v) => update("unitCost", v)} keyboardType="decimal-pad" placeholder="0.00" />
      <Input label="Notes" value={data.notes} onChangeText={(v) => update("notes", v)} placeholder="Optional" multiline />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.xl },
  row: { flexDirection: "row", gap: spacing.md },
  half: { flex: 1 },
});
