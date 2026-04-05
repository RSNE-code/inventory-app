/**
 * WorkPipelines — BOM Status + Fabrication as separate exported cards.
 * Each card is independently renderable for uniform 3-card dashboard row.
 */
import { StyleSheet, View, Text } from "react-native";
import { ClipboardList, Factory } from "lucide-react-native";
import { Card } from "@/components/ui/Card";
import { colors } from "@/constants/colors";
import { type as typography } from "@/constants/typography";
import { spacing, radius } from "@/constants/layout";

interface WorkPipelinesProps {
  bomStatusCounts: Record<string, number>;
  fabrication: { pendingApprovals: number; inProduction: number; completed: number };
  doorQueueCount: number;
}

const BOM_STATUSES = [
  { key: "DRAFT", label: "Draft", dot: colors.textMuted },
  { key: "PENDING_REVIEW", label: "Review", dot: colors.brandOrange },
  { key: "APPROVED", label: "Approved", dot: colors.brandBlue },
  { key: "IN_PROGRESS", label: "In Progress", dot: colors.statusYellow },
];

/** BOM pipeline card — standalone */
export function BomPipelineCard({ bomStatusCounts }: { bomStatusCounts: Record<string, number> }) {
  const totalActiveBoms = Object.values(bomStatusCounts).reduce((s, n) => s + n, 0);

  return (
    <Card accent="blue" style={styles.pipelineCard}>
      <View style={styles.cardHeader}>
        <View style={styles.iconBox}>
          <ClipboardList size={16} color={colors.brandBlue} strokeWidth={2} />
        </View>
        <Text style={styles.cardTitle}>BOM Status</Text>
      </View>
      <View style={styles.rows}>
        {BOM_STATUSES.map((s) => {
          const count = bomStatusCounts[s.key] || 0;
          if (count === 0) return null;
          return (
            <View key={s.key} style={styles.statusRow}>
              <View style={[styles.dot, { backgroundColor: s.dot }]} />
              <Text style={styles.statusCount}>{count}</Text>
              <Text style={styles.statusLabel}>{s.label}</Text>
            </View>
          );
        })}
      </View>
      {totalActiveBoms > 0 ? (
        <Text style={styles.footer}>{totalActiveBoms} active total</Text>
      ) : null}
    </Card>
  );
}

/** Fabrication pipeline card — standalone */
export function FabPipelineCard({ fabrication, doorQueueCount }: { fabrication: { pendingApprovals: number; inProduction: number; completed: number }; doorQueueCount: number }) {
  const fabRows = [
    { label: "In Queue", count: doorQueueCount, dot: colors.brandOrange },
    { label: "In Production", count: fabrication.inProduction, dot: colors.statusYellow },
    { label: "Completed", count: fabrication.completed, dot: colors.statusGreen },
  ];

  return (
    <Card accent="orange" style={styles.pipelineCard}>
      <View style={styles.cardHeader}>
        <View style={[styles.iconBox, { backgroundColor: "rgba(232, 121, 43, 0.12)" }]}>
          <Factory size={16} color={colors.brandOrange} strokeWidth={2} />
        </View>
        <Text style={styles.cardTitle}>Fabrication</Text>
      </View>
      <View style={styles.rows}>
        {fabRows.map((row) => {
          if (row.count === 0) return null;
          return (
            <View key={row.label} style={styles.statusRow}>
              <View style={[styles.dot, { backgroundColor: row.dot }]} />
              <Text style={styles.statusCount}>{row.count}</Text>
              <Text style={styles.statusLabel}>{row.label}</Text>
            </View>
          );
        })}
      </View>
      {fabrication.pendingApprovals > 0 ? (
        <Text style={styles.footerWarning}>
          {fabrication.pendingApprovals} awaiting approval
        </Text>
      ) : null}
    </Card>
  );
}

/** Legacy wrapper — renders both side-by-side (used by phone layout) */
export function WorkPipelines({ bomStatusCounts, fabrication, doorQueueCount }: WorkPipelinesProps) {
  return (
    <View style={styles.grid}>
      <BomPipelineCard bomStatusCounts={bomStatusCounts} />
      <FabPipelineCard fabrication={fabrication} doorQueueCount={doorQueueCount} />
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    gap: spacing.md,
  },
  pipelineCard: {
    flex: 1,
    padding: spacing.xl,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: radius.xl,
    backgroundColor: "rgba(46, 125, 186, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  cardTitle: {
    ...typography.subtitle,
    fontWeight: "700",
    color: colors.navy,
  },
  rows: {
    gap: spacing.sm,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusCount: {
    ...typography.subtitle,
    fontWeight: "700",
    color: colors.navy,
    fontVariant: ["tabular-nums"],
  },
  statusLabel: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: "500",
  },
  footer: {
    ...typography.caption,
    color: colors.textMuted,
    fontWeight: "500",
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(226, 230, 235, 0.4)",
  },
  footerWarning: {
    ...typography.caption,
    color: colors.statusYellow,
    fontWeight: "600",
    marginTop: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(226, 230, 235, 0.4)",
  },
});
