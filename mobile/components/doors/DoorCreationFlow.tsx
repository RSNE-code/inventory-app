/**
 * DoorCreationFlow — multi-step door creation wizard.
 * Steps: Name → Build Specs → Confirm → Create
 */
import { useState, useCallback } from "react";
import { StyleSheet, ScrollView, View, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import { StepProgress } from "@/components/layout/StepProgress";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { DoorBuilder } from "./DoorBuilder";
import { DoorConfirmation } from "./DoorConfirmation";
import { useCreateAssembly } from "@/hooks/use-assemblies";
import { colors } from "@/constants/colors";
import { spacing } from "@/constants/layout";
import type { DoorSpecs } from "@/lib/door-specs";

type Step = "NAME" | "BUILD" | "CONFIRM";

const STEPS = ["Name", "Specs", "Confirm"];

interface DoorCreationFlowProps {
  /** Pre-fill job name (e.g. from BOM context) */
  initialJobName?: string;
  /** Pre-fill door name hint */
  initialName?: string;
}

export function DoorCreationFlow({ initialJobName, initialName }: DoorCreationFlowProps = {}) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const createAssembly = useCreateAssembly();

  const [step, setStep] = useState<Step>("NAME");
  const [name, setName] = useState(initialName ?? "");
  const [jobName, setJobName] = useState(initialJobName ?? "");
  const [specs, setSpecs] = useState<Partial<DoorSpecs>>({});

  const stepIndex = step === "NAME" ? 0 : step === "BUILD" ? 1 : 2;

  const handleCreate = useCallback(async () => {
    if (!name.trim()) return;
    try {
      const result = await createAssembly.mutateAsync({
        name: name.trim(),
        type: "DOOR",
        jobName: jobName || undefined,
        specs: specs as Record<string, unknown>,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const id = (result as any)?.id ?? (result as any)?.data?.id;
      if (id) router.replace(`/assemblies/${id}`);
      else router.back();
    } catch {
      Alert.alert("Error", "Failed to create door");
    }
  }, [name, jobName, specs, createAssembly, router]);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
    >
      <StepProgress steps={STEPS} currentStep={stepIndex} />

      {step === "NAME" && (
        <View style={styles.form}>
          <Input label="Door Name *" value={name} onChangeText={setName} placeholder="e.g. Walk-in Cooler Door #3" />
          <Input label="Job Name" value={jobName} onChangeText={setJobName} placeholder="Optional" />
          <Button title="Next: Specs" onPress={() => setStep("BUILD")} disabled={!name.trim()} size="lg" />
        </View>
      )}

      {step === "BUILD" && (
        <DoorBuilder
          specs={specs}
          onUpdate={setSpecs}
          onComplete={() => setStep("CONFIRM")}
        />
      )}

      {step === "CONFIRM" && (
        <DoorConfirmation
          specs={specs}
          name={name}
          onConfirm={handleCreate}
          onBack={() => setStep("BUILD")}
          loading={createAssembly.isPending}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.lg, gap: spacing.xl },
  form: { gap: spacing.xl },
});
