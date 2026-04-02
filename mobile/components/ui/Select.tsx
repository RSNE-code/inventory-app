/**
 * Select — dropdown picker matching web's select.tsx.
 */
import { useState } from "react";
import { StyleSheet, View, Text, Pressable, FlatList, Modal } from "react-native";
import { ChevronDown, Check } from "lucide-react-native";
import { colors } from "@/constants/colors";
import { type as typography } from "@/constants/typography";
import { spacing, radius } from "@/constants/layout";
import { shadowBrandMd } from "@/constants/shadows";

interface SelectOption {
  label: string;
  value: string;
}

interface SelectProps {
  label?: string;
  value: string;
  options: SelectOption[];
  onValueChange: (value: string) => void;
  placeholder?: string;
}

export function Select({ label, value, options, onValueChange, placeholder = "Select\u2026" }: SelectProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <View>
      {label && <Text style={styles.label}>{label}</Text>}
      <Pressable style={styles.trigger} onPress={() => setOpen(true)}>
        <Text style={[styles.triggerText, !selected && styles.placeholder]}>
          {selected?.label ?? placeholder}
        </Text>
        <ChevronDown size={18} color={colors.textMuted} strokeWidth={2} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setOpen(false)}>
          <View style={styles.dropdown}>
            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => (
                <Pressable
                  style={styles.option}
                  onPress={() => { onValueChange(item.value); setOpen(false); }}
                >
                  <Text style={[styles.optionText, item.value === value && styles.optionActive]}>
                    {item.label}
                  </Text>
                  {item.value === value && <Check size={16} color={colors.brandBlue} strokeWidth={2} />}
                </Pressable>
              )}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { ...typography.caption, fontWeight: "500", color: colors.textSecondary, marginBottom: spacing.xs },
  trigger: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    height: 48, backgroundColor: colors.surfaceSecondary, borderRadius: radius.xl,
    paddingHorizontal: spacing.lg, borderWidth: 1, borderColor: "transparent",
  },
  triggerText: { ...typography.body, color: colors.textPrimary },
  placeholder: { color: colors.textMuted },
  overlay: { flex: 1, backgroundColor: colors.overlayDark, justifyContent: "center", padding: spacing["2xl"] },
  dropdown: { backgroundColor: colors.card, borderRadius: radius.xl, maxHeight: 300, ...shadowBrandMd },
  option: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
  optionText: { ...typography.body, color: colors.textPrimary },
  optionActive: { color: colors.brandBlue, fontWeight: "600" },
});
