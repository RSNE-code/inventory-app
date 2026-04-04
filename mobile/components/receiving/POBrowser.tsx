/**
 * POBrowser — browse and select purchase orders for receiving.
 * Matches web's po-browser.tsx with expandable PO rows.
 */
import { useState, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import {
  Package,
  Search,
  Building2,
  Briefcase,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Clock,
} from "lucide-react-native";
import { Card } from "@/components/ui/Card";
import { SearchInput } from "@/components/ui/SearchInput";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/shared/EmptyState";
import { usePurchaseOrders } from "@/hooks/use-receiving";
import { colors } from "@/constants/colors";
import { type as typography } from "@/constants/typography";
import { spacing, radius } from "@/constants/layout";
import { STAGGER_DELAY } from "@/constants/animations";
import type { PurchaseOrder } from "@/types/api";

interface POBrowserProps {
  onSelect: (po: PurchaseOrder) => void;
}

export function POBrowser({ onSelect }: POBrowserProps) {
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { data, isLoading } = usePurchaseOrders();

  const handleToggleExpand = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);
  const allPos: PurchaseOrder[] = (data as any)?.data ?? [];

  const filtered = search
    ? allPos.filter(
        (po) =>
          po.poNumber.toLowerCase().includes(search.toLowerCase()) ||
          po.supplierName.toLowerCase().includes(search.toLowerCase())
      )
    : allPos;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerIcon}>
          <Package size={18} color="rgba(255,255,255,0.8)" strokeWidth={2} />
        </View>
        <View>
          <Text style={styles.headerTitle}>Purchase Orders</Text>
          <Text style={styles.headerSub}>Select a PO to receive against</Text>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <SearchInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search by PO #, supplier, or job\u2026"
        />
      </View>

      {/* Results */}
      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color={colors.brandBlue} />
          <Text style={styles.loadingText}>Loading POs\u2026</Text>
        </View>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Package size={36} color={colors.textMuted} strokeWidth={1.2} />}
          title={search ? "No matching POs" : "No purchase orders"}
          description={search ? "Try a different search term" : undefined}
        />
      ) : (
        <ScrollView style={styles.list} nestedScrollEnabled>
          {filtered.map((item, index) => (
            <Animated.View
              key={item.id}
              entering={FadeInDown.delay(index * STAGGER_DELAY)
                .springify()
                .damping(15)}
            >
              <PORow po={item} expanded={expandedId === item.id} onToggle={() => handleToggleExpand(item.id)} onSelect={() => onSelect(item)} />
              {index < filtered.length - 1 ? <View style={styles.sep} /> : null}
            </Animated.View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function PORow({
  po,
  expanded,
  onToggle,
  onSelect,
}: {
  po: PurchaseOrder;
  expanded: boolean;
  onToggle: () => void;
  onSelect: () => void;
}) {
  const formattedDate = new Date(po.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const lineItems: Array<Record<string, unknown>> = (po as any).lineItems ?? [];

  return (
    <View style={styles.poRow}>
      <Pressable onPress={onToggle} style={styles.poHeaderRow}>
        {/* PO number badge */}
        <View style={styles.poBadge}>
          <Text style={styles.poBadgeText}>{po.poNumber}</Text>
        </View>

        {/* Info */}
        <View style={styles.poInfo}>
          <Text style={styles.poNumber}>PO #{po.poNumber}</Text>
          <View style={styles.poMetaRow}>
            <Building2 size={12} color={colors.textMuted} strokeWidth={2} />
            <Text style={styles.poSupplier} numberOfLines={1}>
              {po.supplierName}
            </Text>
          </View>
          <View style={styles.poMetaRow}>
            <Clock size={11} color={colors.textMuted} strokeWidth={2} />
            <Text style={styles.poDate}>{formattedDate}</Text>
          </View>
        </View>

        {expanded ? (
          <ChevronUp size={16} color={colors.textMuted} strokeWidth={1.5} />
        ) : (
          <ChevronDown size={16} color={colors.textMuted} strokeWidth={1.5} />
        )}
      </Pressable>

      {/* Expanded line items table */}
      {expanded ? (
        <Animated.View entering={FadeInDown.springify().damping(20)} style={styles.expandedContent}>
          {lineItems.length > 0 ? (
            <>
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderText, { flex: 1 }]}>Item</Text>
                <Text style={[styles.tableHeaderText, styles.tableCol]}>Ord</Text>
                <Text style={[styles.tableHeaderText, styles.tableCol]}>Rcvd</Text>
              </View>
              {lineItems.map((li, i) => (
                <View key={String(li.id ?? i)} style={styles.tableRow}>
                  <Text style={[styles.tableCell, { flex: 1 }]} numberOfLines={1}>
                    {String(li.productName ?? "")}
                  </Text>
                  <Text style={[styles.tableCellNum, styles.tableCol]}>
                    {Number(li.quantity ?? 0)}
                  </Text>
                  <Text style={[styles.tableCellNum, styles.tableCol]}>
                    {Number(li.qtyReceived ?? 0)}
                  </Text>
                </View>
              ))}
            </>
          ) : (
            <Text style={styles.noItems}>No line items</Text>
          )}
          <Button title="Receive This PO" onPress={onSelect} size="sm" style={styles.selectBtn} />
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
    backgroundColor: colors.card,
  },
  header: {
    backgroundColor: colors.navy,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  headerIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.xl,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    ...typography.cardTitle,
    color: colors.textInverse,
    fontWeight: "700",
  },
  headerSub: {
    ...typography.caption,
    color: "rgba(255,255,255,0.5)",
    marginTop: 1,
  },
  searchWrap: {
    padding: spacing.md,
  },
  loadingWrap: {
    alignItems: "center",
    paddingVertical: spacing["3xl"],
    gap: spacing.sm,
  },
  loadingText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  list: {
    maxHeight: 420,
    paddingHorizontal: spacing.md,
  },
  sep: {
    height: spacing.sm,
  },
  poRow: {
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: "rgba(226, 230, 235, 0.6)",
    overflow: "hidden",
  },
  poHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  poBadge: {
    width: 40,
    height: 40,
    borderRadius: radius.xl,
    backgroundColor: colors.navy,
    alignItems: "center",
    justifyContent: "center",
  },
  poBadgeText: {
    ...typography.caption,
    fontWeight: "800",
    color: colors.textInverse,
    fontVariant: ["tabular-nums"],
    fontSize: 11,
  },
  poInfo: {
    flex: 1,
    minWidth: 0,
  },
  poNumber: {
    ...typography.subtitle,
    fontWeight: "700",
    color: colors.navy,
    fontVariant: ["tabular-nums"],
  },
  poMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  poSupplier: {
    ...typography.caption,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  poDate: {
    ...typography.caption,
    color: colors.textMuted,
  },
  expandedContent: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  tableHeader: {
    flexDirection: "row",
    paddingBottom: spacing.xs,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    marginBottom: spacing.xs,
  },
  tableHeaderText: { ...typography.caption, fontWeight: "600", color: colors.textMuted },
  tableCol: { width: 48, textAlign: "right" },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.xs,
  },
  tableCell: { ...typography.caption, color: colors.navy },
  tableCellNum: { ...typography.caption, fontWeight: "600", color: colors.navy, fontVariant: ["tabular-nums"] },
  noItems: { ...typography.caption, color: colors.textMuted, textAlign: "center", paddingVertical: spacing.md },
  selectBtn: { marginTop: spacing.sm },
});
