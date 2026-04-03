/**
 * BOM Template detail/edit screen.
 */
import { StyleSheet, ScrollView, View, Text, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Trash2 } from "lucide-react-native";
import { Header } from "@/components/layout/Header";
import { IPadPage } from "@/components/layout/iPadPage";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { LoadingState } from "@/components/shared/LoadingState";
import { ErrorState } from "@/components/shared/ErrorState";
import { useBomTemplate, useDeleteBomTemplate } from "@/hooks/use-bom-templates";
import { useResponsiveSpacing } from "@/lib/hooks/useDeviceType";
import { formatQuantity } from "@/lib/utils";
import { colors } from "@/constants/colors";
import { type as typography } from "@/constants/typography";
import { spacing, DETAIL_MAX_WIDTH } from "@/constants/layout";

export default function BomTemplateDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data, isLoading, error, refetch } = useBomTemplate(id!);
  const deleteMutation = useDeleteBomTemplate();
  const { screenPadding } = useResponsiveSpacing();

  const template = (data as any)?.data ?? data;

  if (isLoading) return (<><Header title="Template" showBack /><LoadingState fullScreen /></>);
  if (error || !template) return (<><Header title="Not Found" showBack /><ErrorState message="Template not found" onRetry={() => refetch()} /></>);

  const t = template as any;
  const lineItems = t.lineItems ?? [];

  const handleDelete = () => {
    Alert.alert("Delete Template", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        await deleteMutation.mutateAsync(id!);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.back();
      }},
    ]);
  };

  return (
    <>
      <Header title={t.name ?? "Template"} showBack />
      <ScrollView style={styles.container} contentContainerStyle={{ padding: screenPadding, paddingBottom: insets.bottom + 100 }}>
        <IPadPage maxWidth={DETAIL_MAX_WIDTH}>
        <Card>
          <Text style={styles.name}>{t.name}</Text>
          {t.description && <Text style={styles.desc}>{t.description}</Text>}
          <Text style={styles.meta}>{lineItems.length} items · Created {new Date(t.createdAt).toLocaleDateString()}</Text>
        </Card>

        <Card style={styles.itemsCard}>
          <Text style={styles.sectionTitle}>Line Items</Text>
          {lineItems.map((li: any, i: number) => (
            <View key={li.id ?? i} style={styles.row}>
              <Text style={styles.itemName} numberOfLines={1}>{li.nonCatalogName ?? li.product?.name ?? "Unknown"}</Text>
              <Text style={styles.itemQty}>{formatQuantity(li.defaultQty)} {li.unitOfMeasure}</Text>
            </View>
          ))}
        </Card>

        <Button title="Delete Template" variant="destructive"
          icon={<Trash2 size={18} color={colors.textInverse} strokeWidth={2} />}
          onPress={handleDelete} />
        </IPadPage>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  name: { ...typography.sectionTitle, color: colors.navy },
  desc: { ...typography.body, color: colors.textMuted, marginTop: spacing.xs },
  meta: { ...typography.caption, color: colors.textMuted, marginTop: spacing.md },
  itemsCard: { marginTop: spacing.lg },
  sectionTitle: { ...typography.cardTitle, color: colors.navy, marginBottom: spacing.sm },
  row: { flexDirection: "row", justifyContent: "space-between", paddingVertical: spacing.sm, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "rgba(226,230,235,0.4)" },
  itemName: { ...typography.subtitle, fontWeight: "500", color: colors.navy, flex: 1, minWidth: 0 },
  itemQty: { ...typography.subtitle, fontWeight: "700", color: colors.brandBlue, fontVariant: ["tabular-nums"], marginLeft: spacing.md },
});
