/**
 * POBrowser — browse and select purchase orders for receiving.
 * Matches web's po-browser.tsx with expandable PO rows.
 */
import { useState } from "react";
import {
  StyleSheet,
  View,
  Text,
  FlatList,
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
  const { data, isLoading } = usePurchaseOrders();
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
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          style={styles.list}
          renderItem={({ item, index }) => (
            <Animated.View
              entering={FadeInDown.delay(index * STAGGER_DELAY)
                .springify()
                .damping(15)}
            >
              <PORow po={item} onSelect={() => onSelect(item)} />
            </Animated.View>
          )}
          ItemSeparatorComponent={() => <View style={styles.sep} />}
        />
      )}
    </View>
  );
}

function PORow({
  po,
  onSelect,
}: {
  po: PurchaseOrder;
  onSelect: () => void;
}) {
  const formattedDate = new Date(po.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return (
    <Pressable onPress={onSelect} style={styles.poRow}>
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

      {/* Select */}
      <View style={styles.poRight}>
        <View style={styles.selectBadge}>
          <Text style={styles.selectText}>Select</Text>
        </View>
        <ChevronRight size={16} color={colors.brandOrange} strokeWidth={2} />
      </View>
    </Pressable>
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
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: "rgba(226, 230, 235, 0.6)",
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
  poRight: {
    alignItems: "center",
    gap: spacing.xs,
  },
  selectBadge: {
    backgroundColor: "rgba(232, 121, 43, 0.12)",
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
  selectText: {
    ...typography.caption,
    fontWeight: "700",
    color: colors.brandOrange,
    fontSize: 11,
  },
});
