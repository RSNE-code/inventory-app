"use client"

import { Card } from "@/components/ui/card"
import { TrendingUp } from "lucide-react"

interface InventoryForecastChartProps {
  currentQty: number
  reorderPoint: number
  transactions: Array<Record<string, unknown>>
}

interface DataPoint {
  day: number // days offset from "today" (negative = past, positive = future)
  qty: number
  projected?: boolean
}

export function InventoryForecastChart({
  currentQty,
  reorderPoint,
  transactions,
}: InventoryForecastChartProps) {
  // Build historical data points from transactions (last 30 days)
  const now = Date.now()
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000

  // Sort transactions by date ascending
  const sorted = [...transactions]
    .filter((t) => new Date(t.createdAt as string).getTime() >= thirtyDaysAgo)
    .sort(
      (a, b) =>
        new Date(a.createdAt as string).getTime() -
        new Date(b.createdAt as string).getTime()
    )

  if (sorted.length < 3) {
    return (
      <Card className="p-4 rounded-xl border-border-custom">
        <h3 className="font-semibold text-navy text-sm mb-2">Projected Inventory</h3>
        <div className="text-center py-6 text-text-muted text-sm">
          <TrendingUp className="h-8 w-8 mx-auto mb-2 text-gray-300" />
          <p>Not enough data to project</p>
          <p className="text-xs text-gray-400 mt-1">Need at least 3 recent transactions</p>
        </div>
      </Card>
    )
  }

  // Walk backwards from currentQty to reconstruct historical levels
  const historyPoints: DataPoint[] = []
  let runningQty = currentQty

  // Add today
  historyPoints.push({ day: 0, qty: runningQty })

  // Walk transactions in reverse to build history
  const reverseSorted = [...sorted].reverse()
  for (const t of reverseSorted) {
    const txDate = new Date(t.createdAt as string).getTime()
    const dayOffset = Math.round((txDate - now) / (24 * 60 * 60 * 1000))
    const qty = Number(t.quantity)
    const type = t.type as string

    // Reverse the transaction effect
    const increases = ["RECEIVE", "RETURN_FULL", "RETURN_PARTIAL", "PRODUCE", "ADJUST_UP"]
    if (increases.includes(type)) {
      runningQty -= qty
    } else {
      runningQty += qty
    }

    historyPoints.push({ day: dayOffset, qty: Math.max(0, runningQty) })
  }

  historyPoints.reverse()

  // Compute avg daily consumption for projection
  const consumptionTypes = ["CHECKOUT", "CONSUME", "ADDITIONAL_PICKUP"]
  const consumptionTxs = sorted.filter((t) => consumptionTypes.includes(t.type as string))
  const totalConsumed = consumptionTxs.reduce(
    (sum, t) => sum + Math.abs(Number(t.quantity)),
    0
  )
  const daysInWindow = Math.max(1, (now - thirtyDaysAgo) / (24 * 60 * 60 * 1000))
  const avgDaily = totalConsumed / daysInWindow

  // Project 14 days into the future
  const projectedPoints: DataPoint[] = []
  let projQty = currentQty
  for (let d = 1; d <= 14; d++) {
    projQty = Math.max(0, projQty - avgDaily)
    projectedPoints.push({ day: d, qty: projQty, projected: true })
  }

  const allPoints = [...historyPoints, ...projectedPoints]

  // Chart dimensions
  const chartW = 320
  const chartH = 120
  const padX = 30
  const padY = 15
  const plotW = chartW - padX * 2
  const plotH = chartH - padY * 2

  // Scale
  const minDay = Math.min(...allPoints.map((p) => p.day))
  const maxDay = Math.max(...allPoints.map((p) => p.day))
  const maxQty = Math.max(reorderPoint * 1.2, ...allPoints.map((p) => p.qty)) * 1.1
  const dayRange = maxDay - minDay || 1

  function x(day: number) {
    return padX + ((day - minDay) / dayRange) * plotW
  }
  function y(qty: number) {
    return padY + plotH - (qty / maxQty) * plotH
  }

  // Build path strings
  const historyPath = historyPoints
    .map((p, i) => `${i === 0 ? "M" : "L"} ${x(p.day).toFixed(1)} ${y(p.qty).toFixed(1)}`)
    .join(" ")

  const projectedPath = [
    `M ${x(0).toFixed(1)} ${y(currentQty).toFixed(1)}`,
    ...projectedPoints.map(
      (p) => `L ${x(p.day).toFixed(1)} ${y(p.qty).toFixed(1)}`
    ),
  ].join(" ")

  const reorderY = y(reorderPoint)

  return (
    <Card className="p-4 rounded-xl border-border-custom">
      <h3 className="font-semibold text-navy text-sm mb-3">Projected Inventory</h3>

      <svg viewBox={`0 0 ${chartW} ${chartH}`} className="w-full" preserveAspectRatio="xMidYMid meet">
        {/* Grid lines */}
        <line
          x1={padX} y1={padY + plotH}
          x2={padX + plotW} y2={padY + plotH}
          stroke="#E5E7EB" strokeWidth="1"
        />

        {/* Reorder point line */}
        <line
          x1={padX} y1={reorderY}
          x2={padX + plotW} y2={reorderY}
          stroke="#EF4444" strokeWidth="1"
          strokeDasharray="4 3" opacity="0.6"
        />
        <text x={padX + plotW + 2} y={reorderY + 3} fontSize="7" fill="#EF4444" opacity="0.8">
          Reorder
        </text>

        {/* Today line */}
        <line
          x1={x(0)} y1={padY}
          x2={x(0)} y2={padY + plotH}
          stroke="#8899AB" strokeWidth="0.5"
          strokeDasharray="2 2" opacity="0.5"
        />
        <text x={x(0) - 8} y={padY + plotH + 10} fontSize="7" fill="#8899AB">
          Today
        </text>

        {/* Historical line */}
        <path d={historyPath} fill="none" stroke="#2E7DBA" strokeWidth="2" />

        {/* Projected line */}
        <path
          d={projectedPath}
          fill="none"
          stroke="#2E7DBA"
          strokeWidth="2"
          strokeDasharray="4 3"
          opacity="0.6"
        />

        {/* Current qty dot */}
        <circle cx={x(0)} cy={y(currentQty)} r="3" fill="#2E7DBA" />

        {/* Y-axis labels */}
        <text x={padX - 3} y={padY + 3} fontSize="7" fill="#8899AB" textAnchor="end">
          {Math.round(maxQty)}
        </text>
        <text x={padX - 3} y={padY + plotH + 3} fontSize="7" fill="#8899AB" textAnchor="end">
          0
        </text>
      </svg>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-2 text-[10px] text-text-muted">
        <span className="flex items-center gap-1">
          <span className="w-4 h-0.5 bg-brand-blue inline-block" /> Actual
        </span>
        <span className="flex items-center gap-1">
          <span className="w-4 h-0.5 bg-brand-blue/60 inline-block border-t border-dashed border-brand-blue" /> Projected
        </span>
        <span className="flex items-center gap-1">
          <span className="w-4 h-0.5 bg-status-red/60 inline-block border-t border-dashed border-status-red" /> Reorder
        </span>
      </div>
    </Card>
  )
}
