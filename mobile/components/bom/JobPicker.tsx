/**
 * JobPicker — select or create a job for BOM.
 */
import { useState } from "react";
import { StyleSheet, View, Text, FlatList, Pressable } from "react-native";
import { Briefcase, Plus } from "lucide-react-native";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { SearchInput } from "@/components/ui/SearchInput";
import { useJobs, useCreateJob } from "@/hooks/use-jobs";
import { colors } from "@/constants/colors";
import { type as typography } from "@/constants/typography";
import { spacing, radius } from "@/constants/layout";
import type { Job } from "@/types/api";

interface JobPickerProps {
  selectedJobName: string;
  selectedJobNumber: string;
  onSelect: (jobName: string, jobNumber: string) => void;
}

export function JobPicker({ selectedJobName, selectedJobNumber, onSelect }: JobPickerProps) {
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newNumber, setNewNumber] = useState("");
  const { data } = useJobs(search);
  const createJob = useCreateJob();
  const jobs: Job[] = (data as any)?.data ?? [];

  const handleCreate = async () => {
    if (!newName.trim()) return;
    await createJob.mutateAsync({ name: newName.trim(), number: newNumber || undefined });
    onSelect(newName.trim(), newNumber);
    setShowCreate(false);
  };

  return (
    <View style={styles.container}>
      <SearchInput value={search} onChangeText={setSearch} placeholder="Search jobs\u2026" />
      {!showCreate ? (
        <>
          <FlatList
            data={jobs}
            keyExtractor={(item) => item.id}
            style={styles.list}
            renderItem={({ item }) => (
              <Pressable style={[styles.row, item.name === selectedJobName && styles.rowActive]} onPress={() => onSelect(item.name, item.number ?? "")}>
                <Briefcase size={16} color={item.name === selectedJobName ? colors.brandBlue : colors.textMuted} strokeWidth={1.8} />
                <View style={styles.info}>
                  <Text style={styles.jobName}>{item.name}</Text>
                  {item.number && <Text style={styles.jobNumber}>#{item.number}</Text>}
                </View>
              </Pressable>
            )}
          />
          <Button title="Create New Job" variant="secondary" icon={<Plus size={16} color={colors.textPrimary} strokeWidth={2} />} onPress={() => setShowCreate(true)} size="sm" />
        </>
      ) : (
        <View style={styles.createForm}>
          <Input label="Job Name *" value={newName} onChangeText={setNewName} placeholder="e.g. Smith Residence" />
          <Input label="Job Number" value={newNumber} onChangeText={setNewNumber} placeholder="Optional" />
          <View style={styles.createActions}>
            <Button title="Cancel" variant="ghost" onPress={() => setShowCreate(false)} size="sm" />
            <Button title="Create" onPress={handleCreate} disabled={!newName.trim()} loading={createJob.isPending} size="sm" />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.md },
  list: { maxHeight: 200 },
  row: { flexDirection: "row", alignItems: "center", gap: spacing.md, paddingVertical: spacing.md, paddingHorizontal: spacing.sm, borderRadius: radius.lg },
  rowActive: { backgroundColor: colors.statusBlueBg },
  info: { flex: 1 },
  jobName: { ...typography.subtitle, fontWeight: "500", color: colors.navy },
  jobNumber: { ...typography.caption, color: colors.textMuted },
  createForm: { gap: spacing.md },
  createActions: { flexDirection: "row", gap: spacing.sm, justifyContent: "flex-end" },
});
