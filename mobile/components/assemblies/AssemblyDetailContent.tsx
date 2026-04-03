/**
 * AssemblyDetailContent — reusable assembly detail view.
 * Used both in the [id] route (standalone) and in the Assemblies tab SplitView (inline).
 */
import { StyleSheet, ScrollView, View, Text, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Play, CheckCircle, Truck, Trash2, DoorOpen, Layers } from "lucide-react-native";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { useAssembly, useUpdateAssembly, useDeleteAssembly } from "@/hooks/use-assemblies";
import { useResponsiveSpacing } from "@/lib/hooks/useDeviceType";
import { colors } from "@/constants/colors";
import { type as typography } from "@/constants/typography";
import { spacing } from "@/constants/layout";
import { CARD_ENTER_DELAY } from "@/constants/animations";
import type { Assembly } from "@/types/api";

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

interface AssemblyDetailContentProps {
  assemblyId: string;
  /** Called when the assembly is deleted (e.g. to clear SplitView selection) */
  onDeleted?: () => void;
  /** If true, renders without its own scroll — parent handles scrolling */
  inline?: boolean;
}

export function AssemblyDetailContent({ assemblyId, onDeleted, inline }: AssemblyDetailContentProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { screenPadding } = useResponsiveSpacing();
  const { data, isLoading, error, refetch } = useAssembly(assemblyId);
  const updateMutation = useUpdateAssembly();
  const deleteMutation = useDeleteAssembly();

  const a = ((data as any)?.data ?? data) as Assembly | undefined;

  if (isLoading) return <LoadingState />;
  if (error || !a) return <ErrorState message="Assembly not found" onRetry={() => refetch()} />;

  const statusConfig = STATUS_BADGE[a.status] ?? STATUS_BADGE.PLANNED;
  const isDoor = a.type === "DOOR";
  const specs = a.specs as Record<string, unknown> | null;

  const handleStatusChange = async (newStatus: string) => {
    try {
      await updateMutation.mutateAsync({ id: assemblyId, status: newStatus });
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
          await deleteMutation.mutateAsync(assemblyId);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          if (onDeleted) {
            onDeleted();
          } else {
            router.back();
          }
        },
      },
    ]);
  };

  const content = (
    <>
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
            {Object.entries(specs).map(([key, val]) => {
              // Format display values — no raw true/false
              let displayVal: string;
              if (val === true) displayVal = "Yes";
              else if (val === false) displayVal = "No";
              else if (val === null || val === undefined || val === "") displayVal = "Not specified";
              else displayVal = String(val);

              // Friendlier key names
              const displayKey = key
                .replace(/([A-Z])/g, " $1")
                .replace(/^./, (s) => s.toUpperCase())
                .trim();

              return (
                <View key={key} style={styles.specRow}>
                  <Text style={styles.specKey}>{displayKey}</Text>
                  <Text style={styles.specVal}>{displayVal}</Text>
                </View>
              );
            })}
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
    </>
  );

  if (inline) {
    return <View style={[styles.inlineContainer, { padding: screenPadding }]}>{content}</View>;
  }

  return (
    <ScrollView
      style={styles.scrollContainer}
      contentContainerStyle={{ padding: screenPadding, paddingBottom: insets.bottom + 100 }}
    >
      {content}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollContainer: { flex: 1, backgroundColor: colors.background },
  inlineContainer: { flex: 1, backgroundColor: colors.background },
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
