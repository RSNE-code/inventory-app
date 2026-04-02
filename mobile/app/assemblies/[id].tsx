/**
 * Assembly detail screen — specs, status, actions.
 */
import { StyleSheet, ScrollView, View, Text, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Play, CheckCircle, Truck, Trash2, DoorOpen, Layers } from "lucide-react-native";
import { Header } from "@/components/layout/Header";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Separator } from "@/components/ui/Separator";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { useAssembly, useUpdateAssembly, useDeleteAssembly } from "@/hooks/use-assemblies";
import { colors } from "@/constants/colors";
import { type as typography } from "@/constants/typography";
import { spacing, radius } from "@/constants/layout";
import { CARD_ENTER_DELAY } from "@/constants/animations";

const STATUS_BADGE: Record<string, { label: string; variant: "gray" | "yellow" | "blue" | "orange" | "green" }> = {
  PLANNED: { label: "Planned", variant: "gray" },
  AWAITING_APPROVAL: { label: "Awaiting Approval", variant: "yellow" },
  APPROVED: { label: "Approved", variant: "blue" },
  IN_PRODUCTION: { label: "In Production", variant: "orange" },
  COMPLETED: { label: "Completed", variant: "green" },
  SHIPPED: { label: "Shipped", variant: "gray" },
};

const TYPE_LABELS: Record<string, string> = {
  DOOR: "Door", PANEL: "Panel", FLOOR: "Floor Panel", RAMP: "Ramp",
};

export default function AssemblyDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data, isLoading, error, refetch } = useAssembly(id!);
  const updateMutation = useUpdateAssembly();
  const deleteMutation = useDeleteAssembly();

  const a = ((data as any)?.data ?? data) as Assembly | undefined;

  if (isLoading) return (<><Header title="Assembly" showBack /><LoadingState fullScreen /></>);
  if (error || !a) return (<><Header title="Not Found" showBack /><ErrorState message="Assembly not found" onRetry={() => refetch()} /></>);

  const statusConfig = STATUS_BADGE[a.status] ?? STATUS_BADGE.PLANNED;
  const isDoor = a.type === "DOOR";
  const specs = a.specs as Record<string, unknown> | null;

  const handleStatusChange = async (newStatus: string) => {
    try {
      await updateMutation.mutateAsync({ id: id!, status: newStatus });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert("Error", "Failed to update status");
    }
  };

  const handleDelete = () => {
    Alert.alert("Delete Assembly", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete", style: "destructive",
        onPress: async () => {
          await deleteMutation.mutateAsync(id!);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          router.back();
        },
      },
    ]);
  };

  return (
    <>
      <Header title={a.name} showBack />
      <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}>
        {/* Header card */}
        <Animated.View entering={FadeInDown.delay(CARD_ENTER_DELAY).springify().damping(15)}>
          <Card>
            <View style={styles.topRow}>
              {isDoor ? (
                <DoorOpen size={24} color={colors.brandBlue} strokeWidth={1.5} />
              ) : (
                <Layers size={24} color={colors.brandOrange} strokeWidth={1.5} />
              )}
              <View style={styles.nameCol}>
                <Text style={styles.name}>{a.name}</Text>
                <Text style={styles.typeMeta}>
                  {TYPE_LABELS[a.type] ?? a.type}
                  {a.jobName ? ` · ${a.jobName}` : ""}
                </Text>
              </View>
              <Badge label={statusConfig.label} variant={statusConfig.variant} />
            </View>
            {a.startedAt && (
              <Text style={styles.timestamp}>
                Started: {new Date(a.startedAt).toLocaleDateString()}
              </Text>
            )}
            {a.completedAt && (
              <Text style={styles.timestamp}>
                Completed: {new Date(a.completedAt).toLocaleDateString()}
              </Text>
            )}
          </Card>
        </Animated.View>

        {/* Specs card */}
        {specs && Object.keys(specs).length > 0 && (
          <Animated.View entering={FadeInDown.delay(CARD_ENTER_DELAY * 2).springify().damping(15)}>
            <Card style={styles.specsCard}>
              <Text style={styles.sectionTitle}>Specifications</Text>
              {Object.entries(specs).map(([key, val]) => (
                <View key={key} style={styles.specRow}>
                  <Text style={styles.specKey}>{key.replace(/([A-Z])/g, " $1").trim()}</Text>
                  <Text style={styles.specVal}>{String(val ?? "Not specified")}</Text>
                </View>
              ))}
            </Card>
          </Animated.View>
        )}

        {/* Actions */}
        <Animated.View entering={FadeInDown.delay(CARD_ENTER_DELAY * 3).springify().damping(15)} style={styles.actions}>
          {a.status === "APPROVED" && (
            <Button
              title="Start Build"
              icon={<Play size={18} color={colors.textInverse} strokeWidth={2} />}
              onPress={() => handleStatusChange("IN_PRODUCTION")}
              loading={updateMutation.isPending}
            />
          )}
          {a.status === "IN_PRODUCTION" && (
            <Button
              title="Mark Completed"
              icon={<CheckCircle size={18} color={colors.textInverse} strokeWidth={2} />}
              onPress={() => handleStatusChange("COMPLETED")}
              loading={updateMutation.isPending}
            />
          )}
          {a.status === "COMPLETED" && (
            <Button
              title="Mark as Shipped"
              icon={<Truck size={18} color={colors.textInverse} strokeWidth={2} />}
              onPress={() => handleStatusChange("SHIPPED")}
              loading={updateMutation.isPending}
            />
          )}
          {(a.status === "PLANNED" || a.status === "AWAITING_APPROVAL") && (
            <Button
              title="Delete"
              variant="destructive"
              icon={<Trash2 size={18} color={colors.textInverse} strokeWidth={2} />}
              onPress={handleDelete}
            />
          )}
        </Animated.View>
      </ScrollView>
    </>
  );
}

// Need the type import for TS
type Assembly = import("@/types/api").Assembly;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: spacing.lg },
  topRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  nameCol: { flex: 1, minWidth: 0 },
  name: { ...typography.sectionTitle, color: colors.navy },
  typeMeta: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
  timestamp: { ...typography.caption, color: colors.textMuted, marginTop: spacing.sm },
  specsCard: { marginTop: spacing.lg },
  sectionTitle: { ...typography.cardTitle, color: colors.navy, marginBottom: spacing.md },
  specRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "rgba(226,230,235,0.4)" },
  specKey: { ...typography.body, color: colors.textMuted, textTransform: "capitalize" },
  specVal: { ...typography.body, fontWeight: "500", color: colors.navy },
  actions: { marginTop: spacing.lg, gap: spacing.md },
});
