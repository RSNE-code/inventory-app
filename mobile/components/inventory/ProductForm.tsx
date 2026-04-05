/**
 * ProductForm — reusable create/edit product form.
 * Matches web's product-form.tsx with all 12 fields:
 * name, sku, category, tier, orderUnit, shopUnit, reorderPoint,
 * leadTime, location, dimensions (3 dynamic), notes.
 */
import { StyleSheet, View, Text, Pressable } from "react-native";
import { Plus, X } from "lucide-react-native";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useCategories } from "@/hooks/use-products";
import { colors } from "@/constants/colors";
import { type as typography } from "@/constants/typography";
import { spacing, radius } from "@/constants/layout";

const UNIT_OPTIONS = [
  { label: "Each (ea)", value: "EA" },
  { label: "Linear Feet (LF)", value: "LF" },
  { label: "Square Feet (SF)", value: "SF" },
  { label: "Sheet", value: "SHEET" },
  { label: "Tube", value: "TUBE" },
  { label: "Roll", value: "ROLL" },
  { label: "Box", value: "BOX" },
  { label: "Gallon", value: "GAL" },
];

const TIER_OPTIONS = [
  { label: "Tier 1 — Tracked (with forecasting)", value: "1" },
  { label: "Tier 2 — Basic (count only)", value: "2" },
];

export interface ProductFormData {
  name: string;
  sku: string;
  categoryId: string;
  tier: string;
  unitOfMeasure: string;
  shopUnit: string;
  currentQty: string;
  reorderPoint: string;
  leadTimeDays: string;
  location: string;
  unitCost: string;
  notes: string;
  dimLength: string;
  dimLengthUnit: string;
  dimWidth: string;
  dimWidthUnit: string;
  dimThickness: string;
  dimThicknessUnit: string;
}

export const EMPTY_FORM: ProductFormData = {
  name: "",
  sku: "",
  categoryId: "",
  tier: "1",
  unitOfMeasure: "EA",
  shopUnit: "",
  currentQty: "0",
  reorderPoint: "0",
  leadTimeDays: "",
  location: "",
  unitCost: "",
  notes: "",
  dimLength: "",
  dimLengthUnit: "in",
  dimWidth: "",
  dimWidthUnit: "in",
  dimThickness: "",
  dimThicknessUnit: "in",
};

interface ProductFormProps {
  data: ProductFormData;
  onChange: (data: ProductFormData) => void;
}

const DIM_UNIT_OPTIONS = [
  { label: "in", value: "in" },
  { label: "ft", value: "ft" },
  { label: "mm", value: "mm" },
];

export function ProductForm({ data, onChange }: ProductFormProps) {
  const { data: catData } = useCategories();
  const categories = (catData as any)?.data ?? [];
  const catOptions = categories.map((c: any) => ({ label: c.name, value: c.id }));

  const update = (field: keyof ProductFormData, value: string) =>
    onChange({ ...data, [field]: value });

  const hasDimensions = data.dimLength || data.dimWidth || data.dimThickness;

  return (
    <View style={styles.form}>
      {/* Name (required) */}
      <Input
        label="Product Name *"
        value={data.name}
        onChangeText={(v) => update("name", v)}
        placeholder="e.g. 3/4 Plywood"
        autoCapitalize="words"
      />

      {/* SKU */}
      <Input
        label="SKU"
        value={data.sku}
        onChangeText={(v) => update("sku", v)}
        placeholder="Optional"
        autoCapitalize="characters"
      />

      {/* Category */}
      {catOptions.length > 0 && (
        <Select
          label="Category"
          value={data.categoryId}
          onValueChange={(v) => update("categoryId", v)}
          options={catOptions}
          placeholder="Select category"
        />
      )}

      {/* Tier */}
      <Select
        label="Tier"
        value={data.tier}
        onValueChange={(v) => update("tier", v)}
        options={TIER_OPTIONS}
        placeholder="Select tier"
      />

      {/* Order Unit (required) */}
      <Select
        label="Order Unit *"
        value={data.unitOfMeasure}
        onValueChange={(v) => update("unitOfMeasure", v)}
        options={UNIT_OPTIONS}
        placeholder="Select unit"
      />

      {/* Shop Unit */}
      <Select
        label="Shop Unit"
        value={data.shopUnit}
        onValueChange={(v) => update("shopUnit", v)}
        options={[{ label: "None (same as order unit)", value: "" }, ...UNIT_OPTIONS]}
        placeholder="None"
      />

      {/* Qty + Reorder side-by-side */}
      <View style={styles.row}>
        <Input
          label="Current Qty"
          value={data.currentQty}
          onChangeText={(v) => update("currentQty", v)}
          keyboardType="decimal-pad"
          style={styles.half}
        />
        <Input
          label="Reorder Point"
          value={data.reorderPoint}
          onChangeText={(v) => update("reorderPoint", v)}
          keyboardType="decimal-pad"
          style={styles.half}
        />
      </View>

      {/* Lead Time */}
      <Input
        label="Lead Time (days)"
        value={data.leadTimeDays}
        onChangeText={(v) => update("leadTimeDays", v)}
        keyboardType="number-pad"
        placeholder="e.g. 7"
      />

      {/* Location */}
      <Input
        label="Location"
        value={data.location}
        onChangeText={(v) => update("location", v)}
        placeholder="e.g. Warehouse A, Bay 3"
      />

      {/* Unit Cost */}
      <Input
        label="Unit Cost ($)"
        value={data.unitCost}
        onChangeText={(v) => update("unitCost", v)}
        keyboardType="decimal-pad"
        placeholder="0.00"
      />

      {/* Dimensions — dynamic add/remove */}
      <View style={styles.dimSection}>
        <Text style={styles.dimLabel}>Dimensions</Text>
        {data.dimLength ? (
          <View style={styles.dimRow}>
            <Input
              label="Length"
              value={data.dimLength}
              onChangeText={(v) => update("dimLength", v)}
              keyboardType="decimal-pad"
              style={styles.dimInput}
            />
            <View style={styles.dimUnit}>
              <Select
                value={data.dimLengthUnit}
                onValueChange={(v) => update("dimLengthUnit", v)}
                options={DIM_UNIT_OPTIONS}
              />
            </View>
            <Pressable
              onPress={() => onChange({ ...data, dimLength: "", dimLengthUnit: "in" })}
              style={styles.dimRemove}
            >
              <X size={16} color={colors.textMuted} strokeWidth={2} />
            </Pressable>
          </View>
        ) : null}
        {data.dimWidth ? (
          <View style={styles.dimRow}>
            <Input
              label="Width"
              value={data.dimWidth}
              onChangeText={(v) => update("dimWidth", v)}
              keyboardType="decimal-pad"
              style={styles.dimInput}
            />
            <View style={styles.dimUnit}>
              <Select
                value={data.dimWidthUnit}
                onValueChange={(v) => update("dimWidthUnit", v)}
                options={DIM_UNIT_OPTIONS}
              />
            </View>
            <Pressable
              onPress={() => onChange({ ...data, dimWidth: "", dimWidthUnit: "in" })}
              style={styles.dimRemove}
            >
              <X size={16} color={colors.textMuted} strokeWidth={2} />
            </Pressable>
          </View>
        ) : null}
        {data.dimThickness ? (
          <View style={styles.dimRow}>
            <Input
              label="Thickness"
              value={data.dimThickness}
              onChangeText={(v) => update("dimThickness", v)}
              keyboardType="decimal-pad"
              style={styles.dimInput}
            />
            <View style={styles.dimUnit}>
              <Select
                value={data.dimThicknessUnit}
                onValueChange={(v) => update("dimThicknessUnit", v)}
                options={DIM_UNIT_OPTIONS}
              />
            </View>
            <Pressable
              onPress={() => onChange({ ...data, dimThickness: "", dimThicknessUnit: "in" })}
              style={styles.dimRemove}
            >
              <X size={16} color={colors.textMuted} strokeWidth={2} />
            </Pressable>
          </View>
        ) : null}
        {/* Add dimension button */}
        {(!data.dimLength || !data.dimWidth || !data.dimThickness) && (
          <Pressable
            onPress={() => {
              if (!data.dimLength) onChange({ ...data, dimLength: "0" });
              else if (!data.dimWidth) onChange({ ...data, dimWidth: "0" });
              else onChange({ ...data, dimThickness: "0" });
            }}
            style={styles.addDimBtn}
          >
            <Plus size={16} color={colors.brandBlue} strokeWidth={2} />
            <Text style={styles.addDimText}>
              Add {!data.dimLength ? "length" : !data.dimWidth ? "width" : "thickness"}
            </Text>
          </Pressable>
        )}
      </View>

      {/* Notes */}
      <Input
        label="Notes"
        value={data.notes}
        onChangeText={(v) => update("notes", v)}
        placeholder="Optional"
        multiline
      />
    </View>
  );
}

const styles = StyleSheet.create({
  form: { gap: spacing.xl },
  row: { flexDirection: "row", gap: spacing.md },
  half: { flex: 1 },
  dimSection: { gap: spacing.sm },
  dimLabel: {
    ...typography.caption,
    fontWeight: "500",
    color: colors.textSecondary,
  },
  dimRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: spacing.sm,
  },
  dimInput: { flex: 1 },
  dimUnit: { width: 80 },
  dimRemove: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.xl,
  },
  addDimBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  addDimText: {
    ...typography.subtitle,
    fontWeight: "600",
    color: colors.brandBlue,
  },
});
