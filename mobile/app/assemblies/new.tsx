/**
 * New Assembly — type selection (Door or Panel/Floor/Ramp), then creation flow.
 */
import { useState } from "react";
import { StyleSheet, View, Text, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { DoorOpen, Layers } from "lucide-react-native";
import { Header } from "@/components/layout/Header";
import { IPadPage } from "@/components/layout/iPadPage";
import { Card } from "@/components/ui/Card";
import { DoorCreationFlow } from "@/components/doors/DoorCreationFlow";
import { FabCreationFlow } from "@/components/fab/FabCreationFlow";
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
  const insets = useSafeAreaInsets();
  const { screenPadding } = useResponsiveSpacing();

  const [flow, setFlow] = useState<Flow>("choose");
  const [fabType, setFabType] = useState<FabType>("PANEL");

  // Door flow renders its own ScrollView — don't nest it
  if (flow === "door") {
    return (
      <>
        <Header title="New Door" showBack />
        <IPadPage>
          <DoorCreationFlow />
        </IPadPage>
      </>
    );
  }

  // Fab flow renders its own wizard — don't nest it
  if (flow === "fab") {
    return (
      <>
        <Header title="New Assembly" showBack />
        <IPadPage>
          <FabCreationFlow initialType={fabType} />
        </IPadPage>
      </>
    );
  }

  return (
    <>
      <Header title="New Assembly" showBack />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.flex}>
        <ScrollView style={styles.container} contentContainerStyle={{ padding: screenPadding, paddingBottom: insets.bottom + 100 }}>
          <IPadPage>
          {flow === "choose" ? (
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
          ) : null}
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
});
