/**
 * New Assembly — type selection (Door or Panel/Floor/Ramp), then creation flow.
 */
import { useState } from "react";
import { StyleSheet, View, Text, Alert, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { DoorOpen, Layers } from "lucide-react-native";
import { Header } from "@/components/layout/Header";
import { IPadPage } from "@/components/layout/iPadPage";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useCreateAssembly } from "@/hooks/use-assemblies";
import { useResponsiveSpacing } from "@/lib/hooks/useDeviceType";
import { colors } from "@/constants/colors";
import { type as typography } from "@/constants/typography";
import { spacing, radius } from "@/constants/layout";
import { CARD_ENTER_DELAY } from "@/constants/animations";

type Flow = "choose" | "door" | "fab";
type FabType = "PANEL" | "FLOOR" | "RAMP";

const FAB_OPTIONS: { type: FabType; label: string; description: string }[] = [
  { type: "PANEL", label: "Wall Panel", description: "Insulated wall panel" },
  { type: "FLOOR", label: "Floor Panel", description: "Insulated floor panel" },
  { type: "RAMP", label: "Ramp", description: "Access ramp" },
];

export default function NewAssemblyScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const createMutation = useCreateAssembly();
  const { screenPadding } = useResponsiveSpacing();

  const [flow, setFlow] = useState<Flow>("choose");
  const [name, setName] = useState("");
  const [jobName, setJobName] = useState("");
  const [fabType, setFabType] = useState<FabType>("PANEL");
  const [length, setLength] = useState("");
  const [width, setWidth] = useState("");

  const title = flow === "door" ? "New Door" : flow === "fab" ? "New Assembly" : "New Assembly";

  const handleCreateDoor = async () => {
    if (!name.trim()) return;
    try {
      const result = await createMutation.mutateAsync({
        name: name.trim(),
        type: "DOOR",
        jobName: jobName || undefined,
        specs: {},
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const r = result as any;
      const newId = r?.data?.id ?? r?.id;
      if (newId) {
        router.back();
        setTimeout(() => router.push(`/assemblies/${newId}`), 100);
      } else {
        router.back();
      }
    } catch {
      Alert.alert("Error", "Failed to create door");
    }
  };

  const handleCreateFab = async () => {
    if (!name.trim()) return;
    try {
      const result = await createMutation.mutateAsync({
        name: name.trim(),
        type: fabType,
        jobName: jobName || undefined,
        specs: {
          length: parseFloat(length) || undefined,
          width: parseFloat(width) || undefined,
        },
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const r = result as any;
      const newId = r?.data?.id ?? r?.id;
      if (newId) {
        router.back();
        setTimeout(() => router.push(`/assemblies/${newId}`), 100);
      } else {
        router.back();
      }
    } catch {
      Alert.alert("Error", "Failed to create assembly");
    }
  };

  return (
    <>
      <Header title={title} showBack />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.flex}>
        <ScrollView style={styles.container} contentContainerStyle={{ padding: screenPadding, paddingBottom: insets.bottom + 100 }}>
          <IPadPage>
          {flow === "choose" && (
            <>
              <Text style={styles.heading}>What are you building?</Text>
              <Text style={styles.subheading}>Select a category to get started</Text>

              <Animated.View entering={FadeInDown.delay(CARD_ENTER_DELAY).springify().damping(15)}>
                <Card onPress={() => { setFlow("door"); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }} style={styles.typeCard}>
                  <View style={styles.typeRow}>
                    <View style={[styles.typeIcon, { backgroundColor: colors.statusBlueBg }]}>
                      <DoorOpen size={28} color={colors.brandBlue} strokeWidth={1.5} />
                    </View>
                    <View style={styles.typeText}>
                      <Text style={styles.typeTitle}>Door</Text>
                      <Text style={styles.typeDesc}>Cooler, freezer, or sliding door</Text>
                    </View>
                  </View>
                </Card>
              </Animated.View>

              <Animated.View entering={FadeInDown.delay(CARD_ENTER_DELAY * 2).springify().damping(15)}>
                <Card onPress={() => { setFlow("fab"); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }} style={styles.typeCard}>
                  <View style={styles.typeRow}>
                    <View style={[styles.typeIcon, { backgroundColor: "rgba(232,121,43,0.12)" }]}>
                      <Layers size={28} color={colors.brandOrange} strokeWidth={1.5} />
                    </View>
                    <View style={styles.typeText}>
                      <Text style={styles.typeTitle}>Panel / Floor / Ramp</Text>
                      <Text style={styles.typeDesc}>Wall panels, floor panels, or ramps</Text>
                    </View>
                  </View>
                </Card>
              </Animated.View>
            </>
          )}

          {flow === "door" && (
            <View style={styles.form}>
              <Input label="Door Name *" value={name} onChangeText={setName} placeholder="e.g. Walk-in Cooler #3" />
              <Input label="Job Name" value={jobName} onChangeText={setJobName} placeholder="Optional" />
              <Text style={styles.hintText}>
                Full door spec builder (dimensions, hardware, frame type) will be available in the enhanced version.
              </Text>
              <Button
                title={createMutation.isPending ? "Creating\u2026" : "Create Door"}
                onPress={handleCreateDoor}
                disabled={!name.trim() || createMutation.isPending}
                loading={createMutation.isPending}
                size="lg"
              />
            </View>
          )}

          {flow === "fab" && (
            <View style={styles.form}>
              {/* Type selection */}
              <Text style={styles.fieldLabel}>Type</Text>
              <View style={styles.fabTypes}>
                {FAB_OPTIONS.map((opt) => (
                  <Card
                    key={opt.type}
                    onPress={() => { setFabType(opt.type); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                    style={{
                      ...styles.fabChip,
                      ...(fabType === opt.type ? styles.fabChipActive : {}),
                    }}
                  >
                    <Text style={[styles.fabChipLabel, fabType === opt.type ? styles.fabChipLabelActive : undefined]}>
                      {opt.label}
                    </Text>
                  </Card>
                ))}
              </View>

              <Input label="Name *" value={name} onChangeText={setName} placeholder="e.g. Floor Panel A" />
              <Input label="Job Name" value={jobName} onChangeText={setJobName} placeholder="Optional" />
              <View style={styles.dimRow}>
                <Input label="Length (ft)" value={length} onChangeText={setLength} keyboardType="decimal-pad" style={styles.half} />
                <Input label="Width (ft)" value={width} onChangeText={setWidth} keyboardType="decimal-pad" style={styles.half} />
              </View>
              <Button
                title={createMutation.isPending ? "Creating\u2026" : "Create Assembly"}
                onPress={handleCreateFab}
                disabled={!name.trim() || createMutation.isPending}
                loading={createMutation.isPending}
                size="lg"
              />
            </View>
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
  heading: { ...typography.sectionTitle, color: colors.navy, textAlign: "center", marginTop: spacing["2xl"] },
  subheading: { ...typography.body, color: colors.textSecondary, textAlign: "center", marginBottom: spacing["2xl"] },
  typeCard: { marginBottom: spacing.md },
  typeRow: { flexDirection: "row", alignItems: "center", gap: spacing.lg },
  typeIcon: { width: 56, height: 56, borderRadius: radius.xl, alignItems: "center", justifyContent: "center" },
  typeText: { flex: 1 },
  typeTitle: { ...typography.cardTitle, color: colors.navy },
  typeDesc: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  form: { gap: spacing.xl },
  fieldLabel: { ...typography.caption, fontWeight: "500", color: colors.textSecondary },
  fabTypes: { flexDirection: "row", gap: spacing.sm },
  fabChip: { flex: 1, padding: spacing.md, alignItems: "center", borderWidth: 0 },
  fabChipActive: { backgroundColor: colors.navy },
  fabChipLabel: { ...typography.caption, fontWeight: "600", color: colors.textSecondary },
  fabChipLabelActive: { color: colors.textInverse },
  dimRow: { flexDirection: "row", gap: spacing.md },
  half: { flex: 1 },
  hintText: { ...typography.body, color: colors.textMuted, fontStyle: "italic" },
});
