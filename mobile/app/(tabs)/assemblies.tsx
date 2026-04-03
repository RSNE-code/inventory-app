/**
 * Assemblies tab — three tabs: Door Shop, Fabrication, Shipping.
 * iPad: SplitView master-detail with queue reorder controls.
 */
import { useState, useCallback, useRef, useEffect } from "react";
import { StyleSheet, View, FlatList, RefreshControl, ScrollView, Alert } from "react-native";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Factory, Plus } from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { Header } from "@/components/layout/Header";
import { Tabs } from "@/components/ui/Tabs";
import { Button } from "@/components/ui/Button";
import { AssemblyCard } from "@/components/assemblies/AssemblyCard";
import { AssemblyDetailContent } from "@/components/assemblies/AssemblyDetailContent";
import { FinishedGoodsList } from "@/components/shipping/FinishedGoodsList";
import { SplitView } from "@/components/layout/SplitView";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingState } from "@/components/shared/LoadingState";
import { useAssemblies, useReorderAssemblies, useBatchShip } from "@/hooks/use-assemblies";
import { useIsTablet, useResponsiveSpacing } from "@/lib/hooks/useDeviceType";
import { colors } from "@/constants/colors";
import { spacing } from "@/constants/layout";
import { STAGGER_DELAY } from "@/constants/animations";
import type { Assembly } from "@/types/api";

const QUEUE_TABS = [
  { key: "DOOR_SHOP", label: "Door Shop" },
  { key: "FABRICATION", label: "Fabrication" },
  { key: "SHIPPING", label: "Shipping" },
];

/** Statuses that can be reordered in the queue */
const REORDERABLE_STATUSES = ["PLANNED", "AWAITING_APPROVAL", "APPROVED"];

export default function AssembliesScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const isTablet = useIsTablet();
  const { screenPadding } = useResponsiveSpacing();
  const [queueTab, setQueueTab] = useState("DOOR_SHOP");
  const [refreshing, setRefreshing] = useState(false);
  const [selectedAssemblyId, setSelectedAssemblyId] = useState<string | null>(null);

  const isShipping = queueTab === "SHIPPING";
  const { data, isLoading, refetch } = useAssemblies(
    isShipping ? {} : { queueType: queueTab as "DOOR_SHOP" | "FABRICATION" }
  );
  const reorderMutation = useReorderAssemblies();
  const batchShipMutation = useBatchShip();
  const [selectedShipIds, setSelectedShipIds] = useState<string[]>([]);

  const assemblies: Assembly[] = (data as any)?.data ?? [];
  const shippingItems = isShipping
    ? assemblies.filter((a) => a.status === "COMPLETED" || a.status === "SHIPPED")
    : assemblies;

  // Split into reorderable (queue) and non-reorderable (in-progress, completed)
  const queueItems = assemblies.filter((a) => REORDERABLE_STATUSES.includes(a.status));
  const otherItems = assemblies.filter((a) => !REORDERABLE_STATUSES.includes(a.status));
  const displayList = isShipping ? shippingItems : assemblies;

  // Optimistic reorder state
  const [localQueue, setLocalQueue] = useState<Assembly[]>([]);
  const pendingRef = useRef<string[] | null>(null);

  useEffect(() => {
    if (pendingRef.current === null) {
      setLocalQueue(queueItems);
    } else {
      const serverIds = queueItems.map((a) => a.id).join(",");
      const pendingIds = pendingRef.current.join(",");
      if (serverIds === pendingIds) {
        pendingRef.current = null;
        setLocalQueue(queueItems);
      }
    }
  }, [queueItems.map((a) => a.id).join(",")]);

  // Auto-select first assembly on iPad when list loads
  useEffect(() => {
    if (isTablet && displayList.length > 0 && !selectedAssemblyId) {
      setSelectedAssemblyId(displayList[0].id);
    }
  }, [isTablet, displayList.length, selectedAssemblyId]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleTabChange = useCallback((tab: string) => {
    setQueueTab(tab);
    setSelectedAssemblyId(null);
    setSelectedShipIds([]);
  }, []);

  const handleToggleShipSelect = useCallback((id: string) => {
    setSelectedShipIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }, []);

  const handleBatchShip = useCallback(() => {
    if (selectedShipIds.length === 0) return;
    batchShipMutation.mutate(selectedShipIds, {
      onSuccess: () => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setSelectedShipIds([]);
      },
      onError: () => Alert.alert("Error", "Failed to ship assemblies"),
    });
  }, [selectedShipIds, batchShipMutation]);

  const handleAssemblyPress = useCallback((assembly: Assembly) => {
    if (isTablet) {
      setSelectedAssemblyId(assembly.id);
    } else {
      router.push(`/assemblies/${assembly.id}`);
    }
  }, [isTablet, router]);

  const moveItem = useCallback((index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= localQueue.length) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newOrder = [...localQueue];
    [newOrder[index], newOrder[newIndex]] = [newOrder[newIndex], newOrder[index]];
    setLocalQueue(newOrder);

    const newIds = newOrder.map((a) => a.id);
    pendingRef.current = newIds;
    reorderMutation.mutate(newIds, {
      onError: () => {
        pendingRef.current = null;
        setLocalQueue(queueItems);
        Alert.alert("Error", "Failed to save queue order");
      },
    });
  }, [localQueue, queueItems, reorderMutation]);

  // Build the full display list: reorderable queue items + other items
  const orderedDisplayList = isShipping ? shippingItems : [...localQueue, ...otherItems];

  /** Master panel: assembly list (or FinishedGoodsList for shipping) */
  const masterContent = (
    <View style={styles.masterContainer}>
      {isLoading ? (
        <LoadingState />
      ) : isShipping ? (
        <View style={{ flex: 1, padding: screenPadding }}>
          <FinishedGoodsList
            assemblies={shippingItems}
            selectedIds={selectedShipIds}
            onToggleSelect={handleToggleShipSelect}
            onBatchShip={handleBatchShip}
            loading={batchShipMutation.isPending}
          />
        </View>
      ) : orderedDisplayList.length === 0 ? (
        <EmptyState
          icon={<Factory size={48} color={colors.textMuted} strokeWidth={1.2} />}
          title={isShipping ? "Nothing to ship" : "Queue is empty"}
          description={isShipping ? "Completed assemblies will appear here" : "Create a new assembly to get started"}
          actionLabel={isShipping ? undefined : "New Assembly"}
          onAction={isShipping ? undefined : () => router.push("/assemblies/new" as never)}
        />
      ) : (
        <FlatList
          data={orderedDisplayList}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => {
            const queueIndex = localQueue.findIndex((q) => q.id === item.id);
            const isInQueue = queueIndex >= 0 && !isShipping;
            return (
              <Animated.View entering={FadeInDown.delay(index * STAGGER_DELAY).springify().damping(20)}>
                <AssemblyCard
                  assembly={item}
                  onPress={() => handleAssemblyPress(item)}
                  isSelected={isTablet && item.id === selectedAssemblyId}
                  position={isInQueue ? queueIndex + 1 : undefined}
                  totalInQueue={isInQueue ? localQueue.length : undefined}
                  onMoveUp={isInQueue ? () => moveItem(queueIndex, "up") : undefined}
                  onMoveDown={isInQueue ? () => moveItem(queueIndex, "down") : undefined}
                />
              </Animated.View>
            );
          }}
          contentContainerStyle={{
            padding: isTablet ? spacing.lg : screenPadding,
            gap: spacing.md,
            paddingBottom: insets.bottom + 100,
          }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brandBlue} />
          }
        />
      )}
    </View>
  );

  /** Detail panel: selected assembly or empty state */
  const detailContent = selectedAssemblyId ? (
    <ScrollView
      style={styles.detailScroll}
      contentContainerStyle={{ paddingBottom: insets.bottom + 100 }}
    >
      <AssemblyDetailContent
        assemblyId={selectedAssemblyId}
        inline
        onDeleted={() => setSelectedAssemblyId(null)}
      />
    </ScrollView>
  ) : (
    <EmptyState
      icon={<Factory size={48} color={colors.textMuted} strokeWidth={1.2} />}
      title="Select an assembly"
      description="Tap an assembly from the list to view details"
    />
  );

  return (
    <>
      <Header
        title="Assemblies"
        action={
          <Button
            title={queueTab === "DOOR_SHOP" ? "New Door" : "New Assembly"}
            variant="primary"
            size="sm"
            icon={<Plus size={18} color={colors.textInverse} strokeWidth={2} />}
            onPress={() => router.push("/assemblies/new" as never)}
          />
        }
      />
      <View style={styles.container}>
        <View style={[styles.tabBar, { paddingHorizontal: screenPadding }]}>
          <Tabs tabs={QUEUE_TABS} activeKey={queueTab} onTabChange={handleTabChange} />
        </View>

        {isTablet ? (
          <SplitView master={masterContent} detail={detailContent} />
        ) : (
          masterContent
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  tabBar: { paddingTop: spacing.md },
  masterContainer: { flex: 1 },
  detailScroll: { flex: 1, backgroundColor: colors.background },
});
