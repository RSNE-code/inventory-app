/**
 * BomCard — list item with job name, status badge, item count, accent bar.
 * Supports reorder controls (up/down) and selection highlight.
 */
import { StyleSheet, View, Text, Pressable } from "react-native";
import { ChevronRight, ChevronUp, ChevronDown, Wrench } from "lucide-react-native";
import { Card } from "@/components/ui/Card";
import { BomStatusBadge } from "./BomStatusBadge";
import { colors } from "@/constants/colors";
import { type as typography } from "@/constants/typography";
import { spacing, radius } from "@/constants/layout";
import type { Bom } from "@/types/api";

type AccentColor = "gray" | "orange" | "blue" | "yellow" | "green" | "red";

const STATUS_ACCENT: Record<string, AccentColor> = {
  DRAFT: "gray",
  PENDING_REVIEW: "orange",
  APPROVED: "blue",
  IN_PROGRESS: "yellow",
  COMPLETED: "green",
  CANCELLED: "red",
};

interface BomCardProps {
  bom: Bom;
  onPress: () => void;
  isSelected?: boolean;
  /** Queue position (1-based) — shows reorder controls when provided */
  position?: number;
  totalInQueue?: number;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

export function BomCard({ bom, onPress, isSelected, position, totalInQueue, onMoveUp, onMoveDown }: BomCardProps) {
  const itemCount = bom._count?.lineItems ?? 0;
  const showReorder = position !== undefined && totalInQueue !== undefined && onMoveUp && onMoveDown;
  const unfabCount = Number((bom as any).unfabricatedCount ?? 0);
  const creatorName = (bom as any).createdBy?.name as string | undefined;

  return (
    <Card
      accent={isSelected ? "blue" : (STATUS_ACCENT[bom.status] ?? "gray")}
      onPress={onPress}
      style={isSelected ? styles.selectedCard : undefined}
    >
      <View style={styles.topRow}>
        {showReorder && (
          <View style={styles.reorderCol}>
            <Pressable
              onPress={(e) => { e.stopPropagation?.(); onMoveUp(); }}
              disabled={position <= 1}
              style={[styles.reorderBtn, position <= 1 && styles.reorderBtnDisabled]}
            >
              <ChevronUp size={18} color={position <= 1 ? colors.border : colors.navy} strokeWidth={2} />
            </Pressable>
            <Text style={styles.positionText}>{position}</Text>
            <Pressable
              onPress={(e) => { e.stopPropagation?.(); onMoveDown(); }}
              disabled={position >= totalInQueue}
              style={[styles.reorderBtn, position >= totalInQueue && styles.reorderBtnDisabled]}
            >
              <ChevronDown size={18} color={position >= totalInQueue ? colors.border : colors.navy} strokeWidth={2} />
            </Pressable>
          </View>
        )}
        <View style={styles.nameCol}>
          <Text style={styles.jobName} numberOfLines={1}>{bom.jobName}</Text>
          {bom.jobNumber ? (
            <Text style={styles.jobNumber}>Job #{bom.jobNumber}</Text>
          ) : null}
        </View>
        <BomStatusBadge status={bom.status} />
      </View>

      {/* Unfabricated assembly badge */}
      {unfabCount > 0 ? (
        <View style={styles.unfabRow}>
          <View style={styles.unfabBadge}>
            <Wrench size={10} color={colors.statusYellow} strokeWidth={2.5} />
            <Text style={styles.unfabText}>{unfabCount} fab item{unfabCount !== 1 ? "s" : ""}</Text>
          </View>
        </View>
      ) : null}

      <View style={styles.bottomRow}>
        <Text style={styles.meta}>
          {itemCount} item{itemCount !== 1 ? "s" : ""}
          {creatorName ? ` · ${creatorName}` : ""}
          <Text style={styles.dot}> · </Text>
          {new Date(bom.createdAt).toLocaleDateString()}
        </Text>
        <ChevronRight size={16} color="rgba(107,127,150,0.3)" strokeWidth={1.5} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  nameCol: {
    flex: 1,
    minWidth: 0,
  },
  jobName: {
    ...typography.cardTitle,
    color: colors.navy,
  },
  jobNumber: {
    ...typography.caption,
    color: colors.textMuted,
    marginTop: 2,
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.md,
  },
  meta: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: "500",
  },
  dot: {
    color: colors.border,
  },
  selectedCard: {
    backgroundColor: "rgba(46, 125, 186, 0.06)",
  },
  reorderCol: {
    alignItems: "center",
    gap: 2,
    marginRight: spacing.sm,
  },
  reorderBtn: {
    width: 32,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.sm,
  },
  reorderBtnDisabled: {
    opacity: 0.3,
  },
  positionText: {
    ...typography.caption,
    fontWeight: "700",
    color: colors.textMuted,
    fontVariant: ["tabular-nums"],
  },
  unfabRow: {
    flexDirection: "row",
    marginTop: spacing.sm,
  },
  unfabBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    backgroundColor: colors.statusYellowBg,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  unfabText: {
    ...typography.caption,
    fontSize: 10,
    fontWeight: "600",
    color: colors.statusYellow,
  },
});
