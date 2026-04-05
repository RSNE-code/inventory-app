/**
 * InventoryTrendChart — SVG line chart with historical + projected inventory value.
 * Self-contained: fetches own data via useDashboardTrend.
 * Matches web's inventory-trend-chart.tsx: category filter pills, today marker,
 * gradient fills, value display with change percentage.
 */
import { useState, useMemo, useCallback } from "react";
import { StyleSheet, View, Text, ScrollView, Pressable, ActivityIndicator } from "react-native";
import Svg, {
  Path,
  Line,
  Circle,
  Defs,
  LinearGradient,
  Stop,
  Text as SvgText,
} from "react-native-svg";
import { TrendingUp, TrendingDown } from "lucide-react-native";
import { Card } from "@/components/ui/Card";
import { useDashboardTrend } from "@/hooks/use-dashboard";
import { formatCurrency } from "@/lib/utils";
import { colors } from "@/constants/colors";
import { type as typography } from "@/constants/typography";
import { spacing, radius } from "@/constants/layout";

const CHART_WIDTH = 360;
const CHART_HEIGHT = 140;
const PADDING = { top: 10, right: 10, bottom: 20, left: 50 };
const PLOT_W = CHART_WIDTH - PADDING.left - PADDING.right;
const PLOT_H = CHART_HEIGHT - PADDING.top - PADDING.bottom;

/** Build an SVG path d-string from data points */
function buildLinePath(
  points: { x: number; y: number }[]
): string {
  if (points.length === 0) return "";
  return points
    .map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");
}

/** Build a closed gradient area path */
function buildAreaPath(
  points: { x: number; y: number }[],
  baseline: number
): string {
  if (points.length === 0) return "";
  const line = buildLinePath(points);
  const lastX = points[points.length - 1].x;
  const firstX = points[0].x;
  return `${line} L${lastX.toFixed(1)},${baseline.toFixed(1)} L${firstX.toFixed(1)},${baseline.toFixed(1)} Z`;
}

export function InventoryTrendChart() {
  const [categoryId, setCategoryId] = useState<string | undefined>(undefined);
  const { data: rawData, isLoading } = useDashboardTrend(categoryId);
  const trendData = (rawData as any)?.data ?? rawData;

  const historical = trendData?.historical ?? [];
  const projected = trendData?.projected ?? [];
  const currentValue = trendData?.currentValue ?? 0;
  const categories = trendData?.categories ?? [];

  // Compute chart points
  const { histPoints, projPoints, yLabels, todayX, changePercent } = useMemo(() => {
    if (historical.length === 0) {
      return { histPoints: [], projPoints: [], yLabels: [] as string[], todayX: 0, changePercent: 0 };
    }

    const allValues = [
      ...historical.map((d: { value: number }) => d.value),
      ...projected.map((d: { value: number }) => d.value),
    ];
    const minVal = Math.min(...allValues) * 0.95;
    const maxVal = Math.max(...allValues) * 1.05;
    const range = maxVal - minVal || 1;

    const totalPoints = historical.length + projected.length;

    const toX = (i: number) => PADDING.left + (i / Math.max(1, totalPoints - 1)) * PLOT_W;
    const toY = (v: number) => PADDING.top + (1 - (v - minVal) / range) * PLOT_H;

    const hp = historical.map((d: { value: number }, i: number) => ({
      x: toX(i),
      y: toY(d.value),
    }));

    const pp = projected.map((d: { value: number }, i: number) => ({
      x: toX(historical.length + i),
      y: toY(d.value),
    }));

    // Y-axis labels (3 ticks)
    const labels = [maxVal, (maxVal + minVal) / 2, minVal].map((v) => {
      if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
      if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}K`;
      return `$${v.toFixed(0)}`;
    });

    // Change percentage
    const firstVal = historical[0]?.value ?? 0;
    const pct = firstVal > 0 ? ((currentValue - firstVal) / firstVal) * 100 : 0;

    return {
      histPoints: hp,
      projPoints: pp,
      yLabels: labels,
      todayX: hp.length > 0 ? hp[hp.length - 1].x : 0,
      changePercent: pct,
    };
  }, [historical, projected, currentValue]);

  const baseline = PADDING.top + PLOT_H;

  const handleCategoryPress = useCallback(
    (id: string | undefined) => {
      setCategoryId((prev) => (prev === id ? undefined : id));
    },
    []
  );

  return (
    <Card>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.iconBox}>
          <TrendingUp size={16} color={colors.brandBlue} strokeWidth={2} />
        </View>
        <Text style={styles.title}>Inventory Trend</Text>
        <Text style={styles.subtitle}>30-day history + forecast</Text>
      </View>

      {/* Value display */}
      <View style={styles.valueRow}>
        <Text style={styles.currentValue}>{formatCurrency(currentValue)}</Text>
        {changePercent !== 0 && (
          <View
            style={[
              styles.changeBadge,
              { backgroundColor: changePercent >= 0 ? colors.statusGreenBg : colors.statusRedBg },
            ]}
          >
            {changePercent >= 0 ? (
              <TrendingUp size={12} color={colors.statusGreen} strokeWidth={2.5} />
            ) : (
              <TrendingDown size={12} color={colors.statusRed} strokeWidth={2.5} />
            )}
            <Text
              style={[
                styles.changeText,
                { color: changePercent >= 0 ? colors.statusGreen : colors.statusRed },
              ]}
            >
              {Math.abs(changePercent).toFixed(1)}%
            </Text>
          </View>
        )}
      </View>

      {/* Category filter pills */}
      {categories.length > 0 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.pillScroll}
          contentContainerStyle={styles.pillContent}
        >
          <Pressable
            onPress={() => handleCategoryPress(undefined)}
            style={[styles.pill, !categoryId && styles.pillActive]}
          >
            <Text style={[styles.pillText, !categoryId && styles.pillTextActive]}>All</Text>
          </Pressable>
          {categories.map((cat: { id: string; name: string }) => (
            <Pressable
              key={cat.id}
              onPress={() => handleCategoryPress(cat.id)}
              style={[styles.pill, categoryId === cat.id && styles.pillActive]}
            >
              <Text style={[styles.pillText, categoryId === cat.id && styles.pillTextActive]}>
                {cat.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      )}

      {/* Chart */}
      {isLoading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="small" color={colors.brandBlue} />
        </View>
      ) : histPoints.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={styles.emptyText}>Not enough data for trend</Text>
        </View>
      ) : (
        <Svg
          width="100%"
          height={CHART_HEIGHT}
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          preserveAspectRatio="xMidYMid meet"
        >
          <Defs>
            <LinearGradient id="histGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={colors.brandBlue} stopOpacity={0.15} />
              <Stop offset="1" stopColor={colors.brandBlue} stopOpacity={0.02} />
            </LinearGradient>
            <LinearGradient id="projGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor={colors.brandOrange} stopOpacity={0.1} />
              <Stop offset="1" stopColor={colors.brandOrange} stopOpacity={0.01} />
            </LinearGradient>
          </Defs>

          {/* Grid lines */}
          {[0, 0.5, 1].map((frac, i) => {
            const y = PADDING.top + frac * PLOT_H;
            return (
              <Line
                key={i}
                x1={PADDING.left}
                y1={y}
                x2={CHART_WIDTH - PADDING.right}
                y2={y}
                stroke={colors.border}
                strokeWidth={0.5}
              />
            );
          })}

          {/* Y-axis labels */}
          {yLabels.map((label, i) => {
            const y = PADDING.top + (i / 2) * PLOT_H;
            return (
              <SvgText
                key={i}
                x={PADDING.left - 6}
                y={y + 4}
                textAnchor="end"
                fill={colors.textMuted}
                fontSize={9}
                fontFamily="Figtree"
              >
                {label}
              </SvgText>
            );
          })}

          {/* Historical gradient fill */}
          <Path d={buildAreaPath(histPoints, baseline)} fill="url(#histGrad)" />

          {/* Projected gradient fill */}
          {projPoints.length > 0 && (
            <Path
              d={buildAreaPath(
                [histPoints[histPoints.length - 1], ...projPoints],
                baseline
              )}
              fill="url(#projGrad)"
            />
          )}

          {/* Historical line */}
          <Path
            d={buildLinePath(histPoints)}
            stroke={colors.brandBlue}
            strokeWidth={2}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Projected line (dashed) */}
          {projPoints.length > 0 && (
            <Path
              d={buildLinePath([histPoints[histPoints.length - 1], ...projPoints])}
              stroke={colors.brandOrange}
              strokeWidth={2}
              fill="none"
              strokeDasharray="4,3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Today marker — vertical dashed line */}
          <Line
            x1={todayX}
            y1={PADDING.top}
            x2={todayX}
            y2={baseline}
            stroke={colors.textMuted}
            strokeWidth={1}
            strokeDasharray="3,3"
            opacity={0.4}
          />

          {/* Today marker — dot */}
          <Circle
            cx={todayX}
            cy={histPoints[histPoints.length - 1]?.y ?? 0}
            r={3.5}
            fill={colors.brandBlue}
            stroke={colors.background}
            strokeWidth={2}
          />
        </Svg>
      )}

      {/* Total row */}
      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Current inventory value</Text>
        <Text style={styles.totalValue}>{formatCurrency(currentValue)}</Text>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: radius.xl,
    backgroundColor: colors.statusBlueBg,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    ...typography.cardTitle,
    color: colors.navy,
    flex: 1,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textMuted,
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  currentValue: {
    fontSize: 20,
    fontFamily: typography.sectionTitle.fontFamily,
    fontWeight: "800",
    color: colors.navy,
    fontVariant: ["tabular-nums"],
    letterSpacing: -0.3,
  },
  changeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  changeText: {
    ...typography.caption,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  pillScroll: {
    marginBottom: spacing.md,
    marginHorizontal: -spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  pillContent: {
    gap: 6,
  },
  pill: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceSecondary,
  },
  pillActive: {
    backgroundColor: colors.navy,
  },
  pillText: {
    ...typography.caption,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  pillTextActive: {
    color: colors.textInverse,
  },
  loadingWrap: {
    height: CHART_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyWrap: {
    height: CHART_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    ...typography.caption,
    color: colors.textMuted,
  },
  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  totalLabel: {
    ...typography.caption,
    color: colors.textMuted,
  },
  totalValue: {
    ...typography.subtitle,
    fontWeight: "700",
    color: colors.navy,
    fontVariant: ["tabular-nums"],
  },
});
