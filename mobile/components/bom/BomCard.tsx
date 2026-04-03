/**
 * BomCard — list item with job name, status badge, item count, accent bar.
 * Matches web's bom-card.tsx.
 */
import { StyleSheet, View, Text } from "react-native";
import { ChevronRight } from "lucide-react-native";
import { Card } from "@/components/ui/Card";
import { BomStatusBadge } from "./BomStatusBadge";
import { colors } from "@/constants/colors";
import { type as typography } from "@/constants/typography";
import { spacing } from "@/constants/layout";
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
}

export function BomCard({ bom, onPress, isSelected }: BomCardProps) {
  const itemCount = bom._count?.lineItems ?? 0;

  return (
    <Card
      accent={isSelected ? "blue" : (STATUS_ACCENT[bom.status] ?? "gray")}
      onPress={onPress}
      style={isSelected ? styles.selectedCard : undefined}
    >
      <View style={styles.topRow}>
        <View style={styles.nameCol}>
          <Text style={styles.jobName} numberOfLines={1}>{bom.jobName}</Text>
          {bom.jobNumber && (
            <Text style={styles.jobNumber}>Job #{bom.jobNumber}</Text>
          )}
        </View>
        <BomStatusBadge status={bom.status} />
      </View>

      <View style={styles.bottomRow}>
        <Text style={styles.meta}>
          {itemCount} item{itemCount !== 1 ? "s" : ""}
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
});
