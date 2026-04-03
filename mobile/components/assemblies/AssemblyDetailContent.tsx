/**
 * AssemblyDetailContent — reusable assembly detail view.
 * Used both in the [id] route (standalone) and in the Assemblies tab SplitView (inline).
 */
import { useState, useCallback } from "react";
import { StyleSheet, ScrollView, View, Text, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { Play, CheckCircle, Truck, Trash2, DoorOpen, Layers, Package2, History, ArrowRight } from "lucide-react-native";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Tabs } from "@/components/ui/Tabs";
import { DoorSpecSheet } from "@/components/doors/DoorSpecSheet";
import { DoorManufacturingSheet } from "@/components/doors/DoorManufacturingSheet";
import { ApprovalCard } from "@/components/assemblies/ApprovalCard";
import { StartBuildModal } from "@/components/shared/StartBuildModal";
import { StepProgress } from "@/components/layout/StepProgress";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { useAssembly, useUpdateAssembly, useDeleteAssembly } from "@/hooks/use-assemblies";
import { useResponsiveSpacing } from "@/lib/hooks/useDeviceType";
import { colors } from "@/constants/colors";
import { type as typography } from "@/constants/typography";
import { spacing, radius } from "@/constants/layout";
import { CARD_ENTER_DELAY } from "@/constants/animations";
import type { Assembly } from "@/types/api";
import type { DoorSpecs } from "@/lib/door-specs";

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

const SHEET_TABS = [
  { key: "spec", label: "Spec Sheet" },
  { key: "manufacturing", label: "Manufacturing" },
];

export function AssemblyDetailContent({ assemblyId, onDeleted, inline }: AssemblyDetailContentProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { screenPadding } = useResponsiveSpacing();
  const { data, isLoading, error, refetch } = useAssembly(assemblyId);
  const updateMutation = useUpdateAssembly();
  const deleteMutation = useDeleteAssembly();
  const [sheetTab, setSheetTab] = useState<"spec" | "manufacturing">("spec");
  const [showStartBuild, setShowStartBuild] = useState(false);

  const a = ((data as any)?.data ?? data) as Assembly | undefined;

  if (isLoading) return <LoadingState />;
  if (error || !a) return <ErrorState message="Assembly not found" onRetry={() => refetch()} />;

  const statusConfig = STATUS_BADGE[a.status] ?? STATUS_BADGE.PLANNED;
  const isDoor = a.type === "DOOR";
  const specs = a.specs as Record<string, unknown> | null;
  const components: Array<Record<string, unknown>> = (a as any).components ?? [];
  const changeLog: Array<Record<string, unknown>> = (a as any).changeLog ?? [];

  const handleStatusChange = useCallback(async (newStatus: string) => {
    try {
      await updateMutation.mutateAsync({ id: assemblyId, status: newStatus });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert("Error", "Failed to update status");
    }
  }, [assemblyId, updateMutation]);

  const handleOpenStartBuild = useCallback(() => {
    setShowStartBuild(true);
  }, []);

  const handleCloseStartBuild = useCallback(() => {
    setShowStartBuild(false);
  }, []);

  const handleConfirmStartBuild = useCallback(async () => {
    await handleStatusChange("IN_PRODUCTION");
    setShowStartBuild(false);
  }, [handleStatusChange]);

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

  const ASSEMBLY_STEPS = ["Created", "Building", "Complete", "Shipped"];
  const stepIndex =
    a.status === "SHIPPED" ? 3 :
    a.status === "COMPLETED" ? 2 :
    a.status === "IN_PRODUCTION" ? 1 : 0;

  const content = (
    <>
      {/* Lifecycle progress */}
      <StepProgress steps={ASSEMBLY_STEPS} currentStep={stepIndex} />

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
                {Number((a as any).batchSize ?? 1) > 1 ? ` · Batch of ${(a as any).batchSize}` : ""}
              </Text>
            </View>
            <Badge label={statusConfig.label} variant={statusConfig.variant} />
          </View>
          <Text style={styles.timestamp}>
            {(a as any).producedBy?.name ? `${(a as any).producedBy.name} · ` : ""}
            {a.createdAt ? new Date(a.createdAt).toLocaleDateString() : ""}
          </Text>
          {a.startedAt ? (
            <Text style={styles.timestamp}>
              Started: {new Date(a.startedAt).toLocaleDateString()}
            </Text>
          ) : null}
          {a.completedAt ? (
            <Text style={styles.timestamp}>
              Completed: {new Date(a.completedAt).toLocaleDateString()}
            </Text>
          ) : null}
          {(a as any).approvedBy?.name ? (
            <Text style={styles.approvedBy}>
              Approved by {(a as any).approvedBy.name}
            </Text>
          ) : null}
          {(a as any).notes ? (
            <View style={styles.notesBox}>
              <Text style={styles.notesBoxText}>{String((a as any).notes)}</Text>
            </View>
          ) : null}
          {(a as any).approvalNotes ? (
            <View style={styles.notesBox}>
              <Text style={styles.notesBoxLabel}>Approval Notes</Text>
              <Text style={styles.notesBoxText}>{String((a as any).approvalNotes)}</Text>
            </View>
          ) : null}
        </Card>
      </Animated.View>

      {/* Specs — door assemblies get tabbed sheets, others get generic card */}
      {isDoor && specs ? (
        <Animated.View entering={FadeInDown.delay(CARD_ENTER_DELAY * 2).springify().damping(15)}>
          <Tabs
            tabs={SHEET_TABS}
            activeKey={sheetTab}
            onTabChange={(key) => setSheetTab(key as "spec" | "manufacturing")}
          />
          <View style={styles.sheetContent}>
            {sheetTab === "spec" ? (
              <DoorSpecSheet specs={specs as Partial<DoorSpecs>} />
            ) : (
              <DoorManufacturingSheet specs={specs as Partial<DoorSpecs>} name={a.name} />
            )}
          </View>
        </Animated.View>
      ) : specs && Object.keys(specs).length > 0 ? (
        <Animated.View entering={FadeInDown.delay(CARD_ENTER_DELAY * 2).springify().damping(15)}>
          <Card style={styles.specsCard}>
            <Text style={styles.sectionTitle}>Specifications</Text>
            {Object.entries(specs).map(([key, val]) => {
              let displayVal: string;
              if (val === true) displayVal = "Yes";
              else if (val === false) displayVal = "No";
              else if (val === null || val === undefined || val === "") displayVal = "Not specified";
              else displayVal = String(val);

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
      ) : null}

      {/* Components Card */}
      {components.length > 0 ? (
        <Animated.View entering={FadeInDown.delay(CARD_ENTER_DELAY * 2.5).springify().damping(15)}>
          <Card style={styles.specsCard}>
            <View style={styles.componentHeader}>
              <Package2 size={18} color={colors.brandBlue} strokeWidth={2} />
              <Text style={styles.sectionTitle}>Components ({components.length})</Text>
            </View>
            {components.map((comp, i) => {
              const product = comp.product as Record<string, unknown> | undefined;
              const productName = String(product?.name ?? "Unknown");
              const currentQty = Number(product?.currentQty ?? 0);
              const qtyUsed = Number(comp.qtyUsed ?? 0);
              const unitCost = Number(comp.unitCost ?? 0);
              const uom = String(product?.unitOfMeasure ?? "ea");
              const hasStock = currentQty >= qtyUsed;
              return (
                <View key={String(comp.id ?? i)} style={styles.componentRow}>
                  <View style={styles.componentInfo}>
                    <Text style={styles.componentName} numberOfLines={1}>{productName}</Text>
                    <Text style={styles.componentMeta}>
                      {qtyUsed} {uom} needed · ${unitCost.toFixed(2)}/ea
                    </Text>
                  </View>
                  <View style={[styles.stockDot, { backgroundColor: hasStock ? colors.statusGreen : colors.statusRed }]} />
                  <Text style={[styles.componentStock, { color: hasStock ? colors.statusGreen : colors.statusRed }]}>
                    {currentQty} avail
                  </Text>
                </View>
              );
            })}
            {components.length > 0 ? (
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total Cost</Text>
                <Text style={styles.totalValue}>
                  ${components.reduce((sum, c) => sum + Number(c.totalCost ?? 0), 0).toFixed(2)}
                </Text>
              </View>
            ) : null}
          </Card>
        </Animated.View>
      ) : null}

      {/* Change History Card */}
      {changeLog.length > 0 ? (
        <Animated.View entering={FadeInDown.delay(CARD_ENTER_DELAY * 2.8).springify().damping(15)}>
          <Card style={styles.specsCard}>
            <View style={styles.componentHeader}>
              <History size={18} color={colors.brandBlue} strokeWidth={2} />
              <Text style={styles.sectionTitle}>Change History</Text>
            </View>
            {changeLog.slice(0, 10).map((entry, i) => {
              const changedBy = entry.changedBy as Record<string, unknown> | undefined;
              return (
                <View key={String(entry.id ?? i)} style={styles.changeRow}>
                  <View style={styles.changeInfo}>
                    <Text style={styles.changeName}>
                      {String(entry.fieldName ?? "").replace(/([A-Z])/g, " $1").replace(/^./, (s: string) => s.toUpperCase()).trim()}
                    </Text>
                    <View style={styles.changeValues}>
                      <Text style={styles.changeOld} numberOfLines={1}>
                        {String(entry.oldValue ?? "—")}
                      </Text>
                      <ArrowRight size={12} color={colors.textMuted} strokeWidth={2} />
                      <Text style={styles.changeNew} numberOfLines={1}>
                        {String(entry.newValue ?? "")}
                      </Text>
                    </View>
                    <Text style={styles.changeMeta}>
                      {changedBy?.name ? `${String(changedBy.name)} · ` : ""}
                      {entry.createdAt ? new Date(String(entry.createdAt)).toLocaleDateString() : ""}
                      {entry.reason ? ` · ${String(entry.reason)}` : ""}
                    </Text>
                  </View>
                </View>
              );
            })}
          </Card>
        </Animated.View>
      ) : null}

      {/* Approval card — for assemblies awaiting approval */}
      {a.status === "AWAITING_APPROVAL" ? (
        <ApprovalCard assemblyId={assemblyId} />
      ) : null}

      {/* Actions */}
      <Animated.View entering={FadeInDown.delay(CARD_ENTER_DELAY * 3).springify().damping(15)} style={styles.actions}>
        {a.status === "APPROVED" ? (
          <Button
            title="Start Build"
            icon={<Play size={18} color={colors.textInverse} strokeWidth={2} />}
            onPress={handleOpenStartBuild}
          />
        ) : null}
        {a.status === "IN_PRODUCTION" ? (
          <Button
            title="Mark Completed"
            icon={<CheckCircle size={18} color={colors.textInverse} strokeWidth={2} />}
            onPress={() => handleStatusChange("COMPLETED")}
            loading={updateMutation.isPending}
          />
        ) : null}
        {a.status === "COMPLETED" ? (
          <Button
            title="Mark as Shipped"
            icon={<Truck size={18} color={colors.textInverse} strokeWidth={2} />}
            onPress={() => handleStatusChange("SHIPPED")}
            loading={updateMutation.isPending}
          />
        ) : null}
        {(a.status === "PLANNED" || a.status === "AWAITING_APPROVAL") ? (
          <Button
            title="Delete"
            variant="destructive"
            icon={<Trash2 size={18} color={colors.textInverse} strokeWidth={2} />}
            onPress={handleDelete}
          />
        ) : null}
      </Animated.View>

      <StartBuildModal
        visible={showStartBuild}
        onClose={handleCloseStartBuild}
        onConfirm={handleConfirmStartBuild}
        assemblyName={a.name}
        loading={updateMutation.isPending}
      />
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
  approvedBy: { ...typography.caption, color: colors.statusGreen, fontWeight: "600", marginTop: spacing.xs },
  notesBox: { backgroundColor: colors.surfaceSecondary, borderRadius: radius.sm, padding: spacing.sm, marginTop: spacing.md },
  notesBoxLabel: { ...typography.caption, color: colors.textMuted, fontWeight: "600", marginBottom: 2 },
  notesBoxText: { ...typography.caption, color: colors.textSecondary },
  specsCard: { marginTop: spacing.lg },
  sectionTitle: { ...typography.cardTitle, color: colors.navy, marginBottom: spacing.md },
  specRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "rgba(226,230,235,0.4)" },
  specKey: { ...typography.body, color: colors.textMuted, textTransform: "capitalize" },
  specVal: { ...typography.body, fontWeight: "500", color: colors.navy },
  actions: { marginTop: spacing.lg, gap: spacing.md },
  sheetContent: { marginTop: spacing.md },
  componentHeader: { flexDirection: "row", alignItems: "center", gap: spacing.sm, marginBottom: spacing.md },
  componentRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "rgba(226,230,235,0.4)" },
  componentInfo: { flex: 1, minWidth: 0 },
  componentName: { ...typography.subtitle, fontWeight: "500", color: colors.navy },
  componentMeta: { ...typography.caption, color: colors.textMuted, marginTop: 1, fontVariant: ["tabular-nums"] },
  stockDot: { width: 8, height: 8, borderRadius: 4 },
  componentStock: { ...typography.caption, fontWeight: "600", fontVariant: ["tabular-nums"], minWidth: 50, textAlign: "right" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", marginTop: spacing.md, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  totalLabel: { ...typography.subtitle, fontWeight: "600", color: colors.textMuted },
  totalValue: { ...typography.subtitle, fontWeight: "700", color: colors.navy, fontVariant: ["tabular-nums"] },
  changeRow: { paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "rgba(226,230,235,0.4)" },
  changeInfo: { gap: 2 },
  changeName: { ...typography.caption, fontWeight: "600", color: colors.navy, textTransform: "capitalize" },
  changeValues: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  changeOld: { ...typography.caption, color: colors.textMuted, maxWidth: 120 },
  changeNew: { ...typography.caption, fontWeight: "600", color: colors.navy, maxWidth: 120 },
  changeMeta: { ...typography.caption, color: colors.textMuted, marginTop: 2 },
});
