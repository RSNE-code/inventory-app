/**
 * JobPicker — reusable job search/select autocomplete.
 * Webapp equivalent: src/components/bom/job-picker.tsx
 *
 * Two states:
 * - Unselected: Search input with dropdown results
 * - Selected: Pill showing job name + number with "Change" link
 */
import { useState, useCallback } from "react";
import { StyleSheet, View, Text, Pressable, FlatList } from "react-native";
import { Briefcase, Search, X } from "lucide-react-native";
import { SearchInput } from "@/components/ui/SearchInput";
import { Card } from "@/components/ui/Card";
import { useJobs } from "@/hooks/use-jobs";
import { colors } from "@/constants/colors";
import { type as typography } from "@/constants/typography";
import { spacing, radius } from "@/constants/layout";
import type { Job } from "@/types/api";

interface JobPickerProps {
  selectedJob: { name: string; number?: string | null } | null;
  onSelect: (job: { name: string; number?: string | null }) => void;
  label?: string;
  required?: boolean;
}

export function JobPicker({ selectedJob, onSelect, label = "Job", required }: JobPickerProps) {
  const [search, setSearch] = useState("");
  const [isOpen, setIsOpen] = useState(false);

  const { data } = useJobs(search || undefined);
  const jobs: Job[] = (data as any)?.data ?? [];

  const handleSelect = useCallback((job: Job) => {
    onSelect({ name: job.name, number: job.number });
    setSearch("");
    setIsOpen(false);
  }, [onSelect]);

  const handleClear = useCallback(() => {
    onSelect({ name: "", number: null });
    setIsOpen(true);
  }, [onSelect]);

  // Selected state — show pill
  if (selectedJob && selectedJob.name) {
    return (
      <View>
        {label && (
          <Text style={styles.label}>
            {label}{required ? " *" : ""}
          </Text>
        )}
        <View style={styles.selectedPill}>
          <View style={styles.selectedIcon}>
            <Briefcase size={16} color={colors.brandBlue} strokeWidth={2} />
          </View>
          <View style={styles.selectedText}>
            <Text style={styles.selectedName} numberOfLines={1}>
              {selectedJob.name}
            </Text>
            {selectedJob.number && (
              <Text style={styles.selectedNumber}>#{selectedJob.number}</Text>
            )}
          </View>
          <Pressable onPress={handleClear} style={styles.changeButton}>
            <Text style={styles.changeLabel}>Change</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // Unselected state — search input with dropdown
  return (
    <View>
      {label && (
        <Text style={styles.label}>
          {label}{required ? " *" : ""}
        </Text>
      )}
      <SearchInput
        value={search}
        onChangeText={(text) => {
          setSearch(text);
          if (!isOpen) setIsOpen(true);
        }}
        placeholder="Search jobs by name or number…"
      />

      {isOpen && jobs.length > 0 && (
        <Card style={styles.dropdown}>
          {jobs.slice(0, 8).map((job) => (
            <Pressable
              key={job.id}
              onPress={() => handleSelect(job)}
              style={styles.resultRow}
            >
              <Briefcase size={16} color={colors.textMuted} strokeWidth={1.8} />
              <View style={styles.resultText}>
                <Text style={styles.resultName} numberOfLines={1}>{job.name}</Text>
                <Text style={styles.resultMeta}>
                  {job.number ? `#${job.number}` : "No number"}
                </Text>
              </View>
            </Pressable>
          ))}
        </Card>
      )}

      {isOpen && search.length > 0 && jobs.length === 0 && (
        <Card style={styles.dropdown}>
          <Text style={styles.noResults}>No jobs found</Text>
        </Card>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  label: {
    ...typography.caption,
    fontWeight: "500",
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  selectedPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.xl,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.md,
  },
  selectedIcon: {
    width: 32,
    height: 32,
    borderRadius: radius.md,
    backgroundColor: colors.statusBlueBg,
    alignItems: "center",
    justifyContent: "center",
  },
  selectedText: {
    flex: 1,
    minWidth: 0,
  },
  selectedName: {
    ...typography.subtitle,
    fontWeight: "600",
    color: colors.navy,
  },
  selectedNumber: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 1,
  },
  changeButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  changeLabel: {
    ...typography.caption,
    fontWeight: "600",
    color: colors.brandBlue,
  },
  dropdown: {
    marginTop: spacing.xs,
    paddingVertical: spacing.xs,
  },
  resultRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    minHeight: 48,
  },
  resultText: {
    flex: 1,
    minWidth: 0,
  },
  resultName: {
    ...typography.subtitle,
    fontWeight: "500",
    color: colors.navy,
  },
  resultMeta: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 1,
  },
  noResults: {
    ...typography.body,
    color: colors.textMuted,
    textAlign: "center",
    paddingVertical: spacing.lg,
  },
});
