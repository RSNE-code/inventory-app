/**
 * AssemblyCard — queue list item with type, status badge, accent bar.
 * Matches web's assembly card pattern.
 */
import { StyleSheet, View, Text, Pressable } from "react-native";
import { DoorOpen, Layers, ChevronRight, ChevronUp, ChevronDown } from "lucide-react-native";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { colors } from "@/constants/colors";
import { type as typography } from "@/constants/typography";
import { spacing, radius } from "@/constants/layout";
import type { Assembly } from "@/types/api";

type AccentColor = "gray" | "yellow" | "blue" | "orange" | "green";

const STATUS_ACCENT: Record<string, AccentColor> = {
  PLANNED: "gray",
  AWAITING_APPROVAL: "yellow",
  APPROVED: "blue",
  IN_PRODUCTION: "orange",
  COMPLETED: "green",
  SHIPPED: "gray",
};

const STATUS_BADGE: Record<string, { label: string; variant: "gray" | "yellow" | "blue" | "orange" | "green" }> = {
  PLANNED: { label: "Planned", variant: "gray" },
  AWAITING_APPROVAL: { label: "Awaiting Approval", variant: "yellow" },
  APPROVED: { label: "Approved", variant: "blue" },
  IN_PRODUCTION: { label: "In Production", variant: "orange" },
  COMPLETED: { label: "Completed", variant: "green" },
  SHIPPED: { label: "Shipped", variant: "gray" },
};

const TYPE_LABELS: Record<string, string> = {
  DOOR: "Door",
  PANEL: "Panel",
  FLOOR: "Floor Panel",
  RAMP: "Ramp",
};

interface AssemblyCardProps {
  assembly: Assembly;
  onPress: () => void;
  isSelected?: boolean;
  /** Queue position (1-based) — shows reorder controls when provided */
  position?: number;
  totalInQueue?: number;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
}

export function AssemblyCard({ assembly, onPress, isSelected, position, totalInQueue, onMoveUp, onMoveDown }: AssemblyCardProps) {
  const statusConfig = STATUS_BADGE[assembly.status] ?? STATUS_BADGE.PLANNED;
  const isDoor = assembly.type === "DOOR";
  const showReorder = position !== undefined && totalInQueue !== undefined && onMoveUp && onMoveDown;

  return (
    <Card
      accent={isSelected ? "blue" : (STATUS_ACCENT[assembly.status] ?? "gray")}
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
        <View style={styles.iconWrap}>
          {isDoor ? (
            <DoorOpen size={18} color={colors.brandBlue} strokeWidth={1.8} />
          ) : (
            <Layers size={18} color={colors.brandOrange} strokeWidth={1.8} />
          )}
        </View>
        <View style={styles.nameCol}>
          <Text style={styles.name} numberOfLines={1}>{assembly.name}</Text>
          <Text style={styles.typeMeta}>
            {TYPE_LABELS[assembly.type] ?? assembly.type}
            {assembly.jobName ? ` · ${assembly.jobName}` : ""}
          </Text>
        </View>
        <Badge label={statusConfig.label} variant={statusConfig.variant} />
      </View>

      <View style={styles.bottomRow}>
        <Text style={styles.date}>
          {new Date(assembly.createdAt).toLocaleDateString()}
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
    gap: spacing.md,
  },
  iconWrap: {
    marginTop: 2,
  },
  nameCol: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    ...typography.cardTitle,
    color: colors.navy,
  },
  typeMeta: {
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
  date: {
    ...typography.caption,
    color: colors.textMuted,
    fontVariant: ["tabular-nums"],
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
});
