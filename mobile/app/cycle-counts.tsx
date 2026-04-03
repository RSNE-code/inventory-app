/**
 * Cycle Counts screen — two tabs: Count + History.
 */
import { useState, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  FlatList,
  RefreshControl,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { ClipboardCheck, MapPin, ChevronRight } from "lucide-react-native";
import { Header } from "@/components/layout/Header";
import { IPadPage } from "@/components/layout/iPadPage";
import { Tabs } from "@/components/ui/Tabs";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingState } from "@/components/shared/LoadingState";
import { useCycleCountData, useRecordCycleCount } from "@/hooks/use-cycle-counts";
import { useResponsiveSpacing } from "@/lib/hooks/useDeviceType";
import { formatQuantity } from "@/lib/utils";
import { colors } from "@/constants/colors";
import { type as typography } from "@/constants/typography";
import { spacing, radius, DETAIL_MAX_WIDTH } from "@/constants/layout";
import { STAGGER_DELAY } from "@/constants/animations";
import type { CycleCountSuggestion, CycleCount } from "@/types/api";

const PAGE_TABS = [
  { key: "count", label: "Count" },
  { key: "history", label: "History" },
];

export default function CycleCountsScreen() {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState("count");
  const [refreshing, setRefreshing] = useState(false);
  const { data, isLoading, refetch } = useCycleCountData();
  const { screenPadding } = useResponsiveSpacing();

  const result = data as { suggestions?: CycleCountSuggestion[]; history?: CycleCount[] } | undefined;
  const suggestions = result?.suggestions ?? [];
  const history = result?.history ?? [];

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  return (
    <>
      <Header title="Cycle Counts" showBack />
      <View style={styles.container}>
        <View style={[styles.tabBar, { paddingHorizontal: screenPadding }]}>
          <Tabs tabs={PAGE_TABS} activeKey={activeTab} onTabChange={setActiveTab} />
        </View>

        {isLoading ? (
          <LoadingState />
        ) : activeTab === "count" ? (
          <CountTab suggestions={suggestions} onRefresh={onRefresh} refreshing={refreshing} insetBottom={insets.bottom} />
        ) : (
          <HistoryTab history={history} onRefresh={onRefresh} refreshing={refreshing} insetBottom={insets.bottom} />
        )}
      </View>
    </>
  );
}

function CountTab({
  suggestions,
  onRefresh,
  refreshing,
  insetBottom,
}: {
  suggestions: CycleCountSuggestion[];
  onRefresh: () => void;
  refreshing: boolean;
  insetBottom: number;
}) {
  const recordMutation = useRecordCycleCount();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [actualQty, setActualQty] = useState("");

  const handleRecord = async (suggestion: CycleCountSuggestion) => {
    const qty = parseFloat(actualQty);
    if (isNaN(qty)) return;
    try {
      await recordMutation.mutateAsync({
        productId: suggestion.productId,
        expectedQty: suggestion.currentQty,
        actualQty: qty,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setActiveId(null);
      setActualQty("");
    } catch {
      Alert.alert("Error", "Failed to record count");
    }
  };

  if (suggestions.length === 0) {
    return (
      <EmptyState
        icon={<ClipboardCheck size={48} color={colors.textMuted} strokeWidth={1.2} />}
        title="All caught up"
        description="No items need counting right now"
      />
    );
  }

  return (
    <FlatList
      data={suggestions}
      keyExtractor={(item) => item.productId}
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: insetBottom + 100 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brandBlue} />}
      renderItem={({ item, index }) => (
        <Animated.View entering={FadeInDown.delay(index * STAGGER_DELAY).springify().damping(15)}>
          <Card
            accent="yellow"
            onPress={() => {
              setActiveId(activeId === item.productId ? null : item.productId);
              setActualQty("");
            }}
          >
            <View style={styles.suggRow}>
              <View style={styles.suggText}>
                <Text style={styles.suggName} numberOfLines={1}>{item.productName}</Text>
                <Text style={styles.suggMeta}>
                  Expected: {formatQuantity(item.currentQty)} {item.unit}
                  {item.location ? ` · ${item.location}` : ""}
                </Text>
                <Text style={styles.suggReason}>{item.reason}</Text>
              </View>
            </View>

            {activeId === item.productId && (
              <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
                <View style={styles.countInput}>
                  <Input
                    label="Actual Count"
                    value={actualQty}
                    onChangeText={setActualQty}
                    keyboardType="decimal-pad"
                    placeholder="Enter actual qty"
                  />
                  <Button
                    title={recordMutation.isPending ? "Saving\u2026" : "Record Count"}
                    onPress={() => handleRecord(item)}
                    disabled={!actualQty || recordMutation.isPending}
                    loading={recordMutation.isPending}
                    size="md"
                  />
                </View>
              </KeyboardAvoidingView>
            )}
          </Card>
        </Animated.View>
      )}
    />
  );
}

function HistoryTab({
  history,
  onRefresh,
  refreshing,
  insetBottom,
}: {
  history: CycleCount[];
  onRefresh: () => void;
  refreshing: boolean;
  insetBottom: number;
}) {
  if (history.length === 0) {
    return (
      <EmptyState
        icon={<ClipboardCheck size={48} color={colors.textMuted} strokeWidth={1.2} />}
        title="No count history"
        description="Completed counts will appear here"
      />
    );
  }

  return (
    <FlatList
      data={history}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{ padding: spacing.lg, gap: spacing.md, paddingBottom: insetBottom + 100 }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.brandBlue} />}
      renderItem={({ item, index }) => {
        const hasVariance = item.variance !== 0;
        return (
          <Animated.View entering={FadeInDown.delay(index * STAGGER_DELAY).springify().damping(15)}>
            <Card accent={hasVariance ? "yellow" : "green"}>
              <Text style={styles.histName}>{item.productName}</Text>
              <View style={styles.histRow}>
                <Text style={styles.histLabel}>Expected: {formatQuantity(item.expectedQty)}</Text>
                <Text style={styles.histLabel}>Actual: {formatQuantity(item.actualQty)}</Text>
                {hasVariance && (
                  <Badge
                    label={`${item.variance > 0 ? "+" : ""}${formatQuantity(item.variance)}`}
                    variant={item.variance > 0 ? "green" : "red"}
                    showDot={false}
                  />
                )}
              </View>
              <Text style={styles.histMeta}>
                {item.countedBy} · {new Date(item.createdAt).toLocaleDateString()}
              </Text>
            </Card>
          </Animated.View>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  tabBar: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
  suggRow: { flexDirection: "row", alignItems: "flex-start", gap: spacing.md },
  suggText: { flex: 1 },
  suggName: { ...typography.cardTitle, color: colors.navy },
  suggMeta: { ...typography.caption, color: colors.textMuted, marginTop: 2, fontVariant: ["tabular-nums"] },
  suggReason: { ...typography.caption, color: colors.brandOrange, fontWeight: "500", marginTop: 4 },
  countInput: { marginTop: spacing.lg, gap: spacing.md },
  histName: { ...typography.subtitle, fontWeight: "600", color: colors.navy },
  histRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginTop: spacing.sm },
  histLabel: { ...typography.caption, color: colors.textMuted, fontVariant: ["tabular-nums"] },
  histMeta: { ...typography.caption, color: colors.textMuted, marginTop: spacing.sm },
});
