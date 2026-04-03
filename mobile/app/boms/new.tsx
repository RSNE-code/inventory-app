/**
 * New BOM screen — AI photo/text parse or manual entry.
 */
import { useState, useCallback, useEffect, useRef } from "react";
import {
  StyleSheet,
  ScrollView,
  View,
  Text,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Header } from "@/components/layout/Header";
import { IPadPage } from "@/components/layout/iPadPage";
import { StepProgress } from "@/components/layout/StepProgress";
import { AIInput } from "@/components/ai/AIInput";
import { capturePhoto } from "@/components/ai/CameraCapture";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { JobPicker } from "@/components/shared/JobPicker";
import { useCreateBom } from "@/hooks/use-boms";
import { useParseReceivingText } from "@/hooks/use-receiving";
import { useResponsiveSpacing } from "@/lib/hooks/useDeviceType";
import { colors } from "@/constants/colors";
import { type as typography } from "@/constants/typography";
import { spacing, radius } from "@/constants/layout";

interface ParsedItem {
  productName: string;
  quantity: number;
  unit: string;
  productId?: string;
}

export default function NewBomScreen() {
  const router = useRouter();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const insets = useSafeAreaInsets();
  const createBom = useCreateBom();
  const parseMutation = useParseReceivingText();
  const { screenPadding } = useResponsiveSpacing();
  const hasTriggeredCamera = useRef(false);

  const [jobName, setJobName] = useState("");
  const [jobNumber, setJobNumber] = useState("");
  const [aiText, setAiText] = useState("");
  const [items, setItems] = useState<ParsedItem[]>([]);
  const [phase, setPhase] = useState<"input" | "review">("input");

  const handleAIParse = useCallback(async () => {
    if (!aiText.trim()) return;
    try {
      const result = await parseMutation.mutateAsync(aiText.trim());
      const parsed = (result as { items?: ParsedItem[] })?.items ?? [];
      if (parsed.length > 0) {
        setItems(parsed);
        setPhase("review");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Alert.alert("No items found", "Try describing the materials differently.");
      }
    } catch {
      Alert.alert("Error", "Failed to parse input.");
    }
  }, [aiText, parseMutation]);

  const handleCamera = useCallback(async () => {
    const uri = await capturePhoto();
    if (!uri) return;
    try {
      const result = await parseMutation.mutateAsync(uri);
      const parsed = (result as { items?: ParsedItem[] })?.items ?? [];
      if (parsed.length > 0) {
        setItems(parsed);
        setPhase("review");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Alert.alert("No items found", "Try taking a clearer photo.");
      }
    } catch {
      Alert.alert("Error", "Failed to parse image.");
    }
  }, [parseMutation]);

  // Auto-trigger camera when arriving from "Packing Slip" entry
  useEffect(() => {
    if (mode === "photo" && !hasTriggeredCamera.current) {
      hasTriggeredCamera.current = true;
      handleCamera();
    }
  }, [mode, handleCamera]);

  const handleCreate = async () => {
    if (!jobName.trim() || items.length === 0) return;
    try {
      const result = await createBom.mutateAsync({
        jobName: jobName.trim(),
        jobNumber: jobNumber || undefined,
        lineItems: items.map((it) => ({
          productName: it.productName,
          quantity: it.quantity,
          unit: it.unit,
          productId: it.productId,
        })),
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const newId = (result as { id?: string })?.id;
      if (newId) {
        router.replace(`/boms/${newId}`);
      } else {
        router.back();
      }
    } catch {
      Alert.alert("Error", "Failed to create BOM.");
    }
  };

  return (
    <>
      <Header title="New BOM" showBack />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.flex}
      >
        <ScrollView
          style={styles.container}
          contentContainerStyle={{ padding: screenPadding, paddingBottom: insets.bottom + 100 }}
        >
          <IPadPage>
          <StepProgress steps={["Items", "Job Info", "Review"]} currentStep={phase === "input" ? 0 : 1} />
          <View style={{ height: spacing.lg }} />
          {/* Job info */}
          <JobPicker
            label="Job"
            required
            selectedJob={jobName ? { name: jobName, number: jobNumber || null } : null}
            onSelect={(job) => {
              setJobName(job.name);
              setJobNumber(job.number ?? "");
            }}
          />

          {phase === "input" ? (
            <>
              <Text style={styles.sectionTitle}>Add Items</Text>
              <Text style={styles.sectionSub}>
                Type, speak, or photograph a material list
              </Text>
              <AIInput
                value={aiText}
                onChangeText={setAiText}
                onSubmit={handleAIParse}
                onMicPress={() => {}}
                onCameraPress={handleCamera}
                isProcessing={parseMutation.isPending}
                placeholder="e.g. 20 sheets 3/4 plywood, 50 LF trim\u2026"
              />
            </>
          ) : (
            <>
              <Text style={styles.sectionTitle}>
                Review Items ({items.length})
              </Text>
              {items.map((item, i) => (
                <Card key={`${item.productName}-${i}`} style={styles.itemCard}>
                  <Text style={styles.itemName}>{item.productName}</Text>
                  <Text style={styles.itemQty}>
                    {item.quantity} {item.unit}
                  </Text>
                </Card>
              ))}

              <Button
                title={createBom.isPending ? "Creating\u2026" : "Create BOM"}
                onPress={handleCreate}
                disabled={!jobName.trim() || createBom.isPending}
                loading={createBom.isPending}
                size="lg"
                style={styles.createBtn}
              />
              <Button
                title="Back to Input"
                variant="ghost"
                onPress={() => setPhase("input")}
              />
            </>
          )}
          </IPadPage>
        </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: colors.background },
  fieldGap: { marginTop: spacing.lg },
  sectionTitle: {
    ...typography.sectionTitle,
    color: colors.navy,
    marginTop: spacing["2xl"],
    marginBottom: spacing.xs,
  },
  sectionSub: {
    ...typography.body,
    color: colors.textMuted,
    marginBottom: spacing.lg,
  },
  itemCard: { marginBottom: spacing.sm },
  itemName: { ...typography.subtitle, fontWeight: "600", color: colors.navy },
  itemQty: { ...typography.body, color: colors.textMuted, marginTop: 2, fontVariant: ["tabular-nums"] },
  createBtn: { marginTop: spacing["2xl"] },
});
