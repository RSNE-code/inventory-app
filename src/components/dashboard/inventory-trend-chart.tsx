"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { Card } from "@/components/ui/card"
import { TrendingUp } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { cn } from "@/lib/utils"

interface TrendDataPoint {
  date: string
  value: number
}

interface TrendData {
  historical: TrendDataPoint[]
  projected: TrendDataPoint[]
  currentValue: number
  categories: Array<{ id: string; name: string }>
}

export function InventoryTrendChart() {
  const [categoryId, setCategoryId] = useState("")

  const { data, isLoading } = useQuery<{ data: TrendData }>({
    queryKey: ["dashboard-trend", categoryId],
    queryFn: async () => {
      const params = categoryId ? `?categoryId=${categoryId}` : ""
      const res = await fetch(`/api/dashboard/trend${params}`)
      if (!res.ok) throw new Error("Failed to fetch trend data")
      return res.json()
    },
    refetchInterval: 60 * 1000,
  })

  const trend = data?.data
  const categories = trend?.categories ?? []

  if (isLoading) {
    return (
      <Card className="p-4 rounded-xl border-border-custom shadow-brand">
        <div className="h-[220px] flex items-center justify-center">
          <div className="h-4 w-4 border-2 border-brand-blue/30 border-t-brand-blue rounded-full animate-spin" />
        </div>
      </Card>
    )
  }

  if (!trend || trend.historical.length < 2) {
    return (
      <Card className="p-4 rounded-xl border-border-custom shadow-brand">
        <h3 className="font-semibold text-navy text-sm tracking-tight mb-3">Inventory Value Trend</h3>
        <div className="text-center py-8 text-text-muted text-sm">
          <TrendingUp className="h-8 w-8 mx-auto mb-2 text-gray-300" />
          <p>Not enough data to chart</p>
        </div>
      </Card>
    )
  }

  const allPoints = [...trend.historical, ...trend.projected]
  const allValues = allPoints.map((p) => p.value)
  const minVal = Math.min(...allValues) * 0.95
  const maxVal = Math.max(...allValues) * 1.05
  const valRange = maxVal - minVal || 1

  // Chart dimensions
  const chartW = 360
  const chartH = 160
  const padL = 8
  const padR = 8
  const padT = 12
  const padB = 24
  const plotW = chartW - padL - padR
  const plotH = chartH - padT - padB

  const totalPoints = allPoints.length
  const historicalCount = trend.historical.length

  function xPos(i: number) {
    return padL + (i / Math.max(1, totalPoints - 1)) * plotW
  }

  function yPos(val: number) {
    return padT + plotH - ((val - minVal) / valRange) * plotH
  }

  // Build smooth path using cardinal spline
  function buildPath(points: Array<{ x: number; y: number }>): string {
    if (points.length < 2) return ""
    let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`
    for (let i = 1; i < points.length; i++) {
      d += ` L ${points[i].x.toFixed(1)} ${points[i].y.toFixed(1)}`
    }
    return d
  }

  // Build gradient area path
  function buildAreaPath(points: Array<{ x: number; y: number }>): string {
    if (points.length < 2) return ""
    const bottomY = padT + plotH
    let d = `M ${points[0].x.toFixed(1)} ${bottomY}`
    for (const p of points) {
      d += ` L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`
    }
    d += ` L ${points[points.length - 1].x.toFixed(1)} ${bottomY} Z`
    return d
  }

  const historicalPoints = trend.historical.map((p, i) => ({
    x: xPos(i),
    y: yPos(p.value),
  }))

  const projectedPoints = [
    { x: xPos(historicalCount - 1), y: yPos(trend.historical[historicalCount - 1].value) },
    ...trend.projected.map((p, i) => ({
      x: xPos(historicalCount + i),
      y: yPos(p.value),
    })),
  ]

  const historicalPath = buildPath(historicalPoints)
  const historicalArea = buildAreaPath(historicalPoints)
  const projectedPath = buildPath(projectedPoints)
  const projectedArea = buildAreaPath(projectedPoints)

  // Today marker position
  const todayX = xPos(historicalCount - 1)

  // Y-axis labels (3 ticks)
  const yLabels = [minVal, (minVal + maxVal) / 2, maxVal]

  // X-axis date labels (first, middle, last)
  const firstDate = trend.historical[0]?.date
  const lastDate = trend.projected[trend.projected.length - 1]?.date
  const formatLabel = (d: string) => {
    const date = new Date(d + "T12:00:00")
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  }

  // Current value and trend direction
  const firstVal = trend.historical[0]?.value ?? 0
  const currentVal = trend.currentValue
  const pctChange = firstVal > 0 ? ((currentVal - firstVal) / firstVal) * 100 : 0

  return (
    <Card className="p-4 rounded-xl border-border-custom shadow-brand">
      {/* Header */}
      <div className="flex items-start justify-between mb-1">
        <div>
          <h3 className="font-semibold text-navy text-sm tracking-tight">Inventory Value</h3>
          <div className="flex items-baseline gap-2 mt-0.5">
            <p className="text-xl font-extrabold text-navy tabular-nums tracking-tight">
              {formatCurrency(currentVal)}
            </p>
            <span className={cn(
              "text-xs font-semibold tabular-nums",
              pctChange >= 0 ? "text-status-green" : "text-status-red"
            )}>
              {pctChange >= 0 ? "+" : ""}{pctChange.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>

      {/* Category filter pills */}
      <div className="flex gap-1.5 overflow-x-auto pb-2 mt-2 scrollbar-hide">
        <button
          onClick={() => setCategoryId("")}
          className={cn(
            "shrink-0 rounded-full px-3 py-1 text-[10px] font-semibold transition-all duration-200",
            categoryId === ""
              ? "bg-navy text-white"
              : "bg-surface-secondary text-text-secondary hover:bg-border-custom"
          )}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setCategoryId(cat.id)}
            className={cn(
              "shrink-0 rounded-full px-3 py-1 text-[10px] font-semibold transition-all duration-200 whitespace-nowrap",
              categoryId === cat.id
                ? "bg-navy text-white"
                : "bg-surface-secondary text-text-secondary hover:bg-border-custom"
            )}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Chart */}
      <svg
        viewBox={`0 0 ${chartW} ${chartH}`}
        className="w-full mt-1"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          {/* Historical gradient */}
          <linearGradient id="historicalGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2E7DBA" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#2E7DBA" stopOpacity="0.02" />
          </linearGradient>
          {/* Projected gradient */}
          <linearGradient id="projectedGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#E8792B" stopOpacity="0.1" />
            <stop offset="100%" stopColor="#E8792B" stopOpacity="0.01" />
          </linearGradient>
        </defs>

        {/* Horizontal grid lines */}
        {yLabels.map((val, i) => (
          <line
            key={i}
            x1={padL}
            y1={yPos(val)}
            x2={padL + plotW}
            y2={yPos(val)}
            stroke="#E2E6EB"
            strokeWidth="0.5"
          />
        ))}

        {/* Historical area fill */}
        <path d={historicalArea} fill="url(#historicalGrad)" />

        {/* Projected area fill */}
        <path d={projectedArea} fill="url(#projectedGrad)" />

        {/* Historical line */}
        <path
          d={historicalPath}
          fill="none"
          stroke="#2E7DBA"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Projected line */}
        <path
          d={projectedPath}
          fill="none"
          stroke="#E8792B"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="4 3"
          opacity="0.8"
        />

        {/* Today vertical marker */}
        <line
          x1={todayX}
          y1={padT}
          x2={todayX}
          y2={padT + plotH}
          stroke="#8899AB"
          strokeWidth="0.5"
          strokeDasharray="2 2"
          opacity="0.4"
        />

        {/* Today dot */}
        <circle
          cx={todayX}
          cy={yPos(currentVal)}
          r="3.5"
          fill="#FFFFFF"
          stroke="#2E7DBA"
          strokeWidth="2"
        />

        {/* Today label */}
        <text
          x={todayX}
          y={padT + plotH + 14}
          fontSize="8"
          fill="#8899AB"
          textAnchor="middle"
          fontFamily="Urbanist, sans-serif"
          fontWeight="600"
        >
          Today
        </text>

        {/* X-axis date labels */}
        {firstDate && (
          <text
            x={padL}
            y={padT + plotH + 14}
            fontSize="7"
            fill="#8899AB"
            textAnchor="start"
            fontFamily="Urbanist, sans-serif"
          >
            {formatLabel(firstDate)}
          </text>
        )}
        {lastDate && (
          <text
            x={padL + plotW}
            y={padT + plotH + 14}
            fontSize="7"
            fill="#8899AB"
            textAnchor="end"
            fontFamily="Urbanist, sans-serif"
          >
            {formatLabel(lastDate)}
          </text>
        )}
      </svg>

      {/* Legend */}
      <div className="flex items-center justify-center gap-4 mt-1 text-[10px] text-text-muted font-medium">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 bg-brand-blue rounded-full inline-block" />
          Historical
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-0.5 bg-brand-orange rounded-full inline-block opacity-80" style={{ backgroundImage: "repeating-linear-gradient(90deg, #E8792B 0, #E8792B 3px, transparent 3px, transparent 5px)" }} />
          Projected
        </span>
      </div>
    </Card>
  )
}
