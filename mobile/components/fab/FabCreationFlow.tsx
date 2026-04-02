/**
 * FabCreationFlow — panel/floor/ramp creation wizard.
 */
import { useState, useCallback } from "react";
import { StyleSheet, View, Alert } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import { StepProgress } from "@/components/layout/StepProgress";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { PanelSpecForm } from "./PanelSpecForm";
import { RampSpecForm } from "./RampSpecForm";
import { useCreateAssembly } from "@/hooks/use-assemblies";
import { getDefaultPanelSpecs, getDefaultRampSpecs, type PanelSpecs, type RampSpecs } from "@/lib/panel-specs";
import { colors } from "@/constants/colors";
import { spacing } from "@/constants/layout";

type FabType = "PANEL" | "FLOOR" | "RAMP";
const STEPS = ["Info", "Specs", "Create"];

export function FabCreationFlow({ initialType }: { initialType?: FabType }) {
  const router = useRouter();
  const createAssembly = useCreateAssembly();
  const [step, setStep] = useState(0);
  const [fabType, setFabType] = useState<FabType>(initialType ?? "PANEL");
  const [name, setName] = useState("");
  const [jobName, setJobName] = useState("");
  const [panelSpecs, setPanelSpecs] = useState<PanelSpecs>(getDefaultPanelSpecs("WALL_PANEL"));
  const [rampSpecs, setRampSpecs] = useState<RampSpecs>(getDefaultRampSpecs());

  const handleCreate = useCallback(async () => {
    if (!name.trim()) return;
    try {
      const specs = fabType === "RAMP" ? rampSpecs : panelSpecs;
      const result = await createAssembly.mutateAsync({
        name: name.trim(), type: fabType, jobName: jobName || undefined,
        specs: specs as unknown as Record<string, unknown>,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const id = (result as any)?.id ?? (result as any)?.data?.id;
      if (id) router.replace(`/assemblies/${id}`);
      else router.back();
    } catch { Alert.alert("Error", "Failed to create assembly"); }
  }, [name, jobName, fabType, panelSpecs, rampSpecs, createAssembly, router]);

  return (
    <View style={styles.container}>
      <StepProgress steps={STEPS} currentStep={step} />
      {step === 0 && (
        <View style={styles.form}>
          <Select label="Type" value={fabType} onValueChange={(v) => setFabType(v as FabType)}
            options={[{ label: "Wall Panel", value: "PANEL" }, { label: "Floor Panel", value: "FLOOR" }, { label: "Ramp", value: "RAMP" }]} />
          <Input label="Name *" value={name} onChangeText={setName} placeholder="e.g. Floor Panel A" />
          <Input label="Job Name" value={jobName} onChangeText={setJobName} placeholder="Optional" />
          <Button title="Next: Specs" onPress={() => setStep(1)} disabled={!name.trim()} size="lg" />
        </View>
      )}
      {step === 1 && (
        <View style={styles.form}>
          {fabType === "RAMP" ? (
            <RampSpecForm specs={rampSpecs} onChange={setRampSpecs} />
          ) : (
            <PanelSpecForm specs={panelSpecs} onChange={setPanelSpecs} type={fabType === "FLOOR" ? "FLOOR_PANEL" : "WALL_PANEL"} />
          )}
          <Button title="Create Assembly" onPress={handleCreate} loading={createAssembly.isPending} size="lg" />
          <Button title="Back" variant="ghost" onPress={() => setStep(0)} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: spacing.xl },
  form: { gap: spacing.xl },
});
