/**
 * CategoryFilter — horizontal scrollable filter chips.
 * Matches web's category-filter.tsx.
 */
import { StyleSheet, ScrollView, Text, Pressable } from "react-native";
import * as Haptics from "expo-haptics";
import { colors } from "@/constants/colors";
import { type as typography } from "@/constants/typography";
import { spacing, radius } from "@/constants/layout";
import type { Category } from "@/types/api";

interface CategoryFilterProps {
  categories: Category[];
  selected: string;
  onSelect: (id: string) => void;
}

export function CategoryFilter({ categories, selected, onSelect }: CategoryFilterProps) {
  const handlePress = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelect(id === selected ? "" : id);
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      <Pressable
        onPress={() => handlePress("")}
        style={[styles.chip, !selected && styles.chipActive]}
      >
        <Text style={[styles.chipLabel, !selected && styles.chipLabelActive]}>All</Text>
      </Pressable>
      {categories.map((cat) => {
        const isActive = cat.id === selected;
        return (
          <Pressable
            key={cat.id}
            onPress={() => handlePress(cat.id)}
            style={[styles.chip, isActive && styles.chipActive]}
          >
            <Text style={[styles.chipLabel, isActive && styles.chipLabelActive]}>
              {cat.name}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceSecondary,
  },
  chipActive: {
    backgroundColor: colors.navy,
  },
  chipLabel: {
    ...typography.caption,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  chipLabelActive: {
    color: colors.textInverse,
  },
});
