"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn, formatQuantity } from "@/lib/utils"
import { AlertTriangle, TrendingDown, ShieldCheck } from "lucide-react"

interface StockoutRiskCardProps {
  currentQty: number
  reorderPoint: number
  transactions: Array<Record<string, unknown>>
  unitOfMeasure: string
}

function computeConsumptionRate(transactions: Array<Record<string, unknown>>): {
  avgDaily: number
  daysCovered: number
} {
  const consumptionTypes = ["CHECKOUT", "CONSUME", "ADDITIONAL_PICKUP"]
  const now = Date.now()
  const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000
  const sixtyDaysAgo = now - 60 * 24 * 60 * 60 * 1000

  // Try 30 days first, fall back to 60
  let windowMs = now - thirtyDaysAgo
  let windowLabel = 30

  const recent = transactions.filter((t) => {
    const type = t.type as string
    const date = new Date(t.createdAt as string).getTime()
    return consumptionTypes.includes(type) && date >= thirtyDaysAgo
  })

  let totalConsumed = recent.reduce((sum, t) => sum + Math.abs(Number(t.quantity)), 0)

  if (recent.length < 3) {
    // Try 60-day window
    const wider = transactions.filter((t) => {
      const type = t.type as string
      const date = new Date(t.createdAt as string).getTime()
      return consumptionTypes.includes(type) && date >= sixtyDaysAgo
    })
    totalConsumed = wider.reduce((sum, t) => sum + Math.abs(Number(t.quantity)), 0)
    windowMs = now - sixtyDaysAgo
    windowLabel = 60

    if (wider.length < 3) {
      return { avgDaily: 0, daysCovered: 0 }
    }
  }

  const days = windowMs / (24 * 60 * 60 * 1000)
  return { avgDaily: totalConsumed / days, daysCovered: windowLabel }
}

export function StockoutRiskCard({
  currentQty,
  reorderPoint,
  transactions,
  unitOfMeasure,
}: StockoutRiskCardProps) {
  const { avgDaily, daysCovered } = computeConsumptionRate(transactions)

  // Safety stock approximation = reorder point
  const safetyStock = reorderPoint
  const available = Math.max(0, currentQty)

  if (avgDaily === 0) {
    return (
      <Card className="p-4 rounded-xl border-border-custom">
        <h3 className="font-semibold text-navy text-sm mb-2">Stockout Risk</h3>
        <div className="text-center py-4 text-text-muted text-sm">
          <TrendingDown className="h-8 w-8 mx-auto mb-2 text-text-muted/60" />
          <p>Not enough consumption data to estimate risk</p>
          <p className="text-xs text-text-muted mt-1">Need at least 3 checkout transactions</p>
        </div>
      </Card>
    )
  }

  const daysUntilStockout = available / avgDaily
  const daysUntilReorder = Math.max(0, (available - safetyStock) / avgDaily)

  // Risk level
  let riskLevel: "safe" | "watch" | "critical"
  if (daysUntilStockout <= 7) riskLevel = "critical"
  else if (daysUntilStockout <= 21) riskLevel = "watch"
  else riskLevel = "safe"

  const riskColors = {
    safe: "text-status-green",
    watch: "text-status-yellow",
    critical: "text-status-red",
  }

  const riskBgColors = {
    safe: "bg-status-green/10 border-status-green/30",
    watch: "bg-yellow-50 border-yellow-200",
    critical: "bg-status-red/10 border-status-red/30",
  }

  const riskBadgeColors = {
    safe: "bg-status-green/20 text-status-green",
    watch: "bg-yellow-100 text-yellow-700",
    critical: "bg-status-red/20 text-status-red",
  }

  // Gauge position: 0% = critical, 100% = safe
  const gaugePercent = Math.min(100, Math.max(0, (daysUntilStockout / 60) * 100))

  // Suggested reorder date
  const reorderByDate = new Date(Date.now() + daysUntilReorder * 24 * 60 * 60 * 1000)
  const reorderDateStr = reorderByDate.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })

  return (
    <Card className="p-4 rounded-xl border-border-custom space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-navy text-sm">Stockout Risk</h3>
        <Badge className={cn("text-xs font-semibold", riskBadgeColors[riskLevel])}>
          {riskLevel === "critical" && <AlertTriangle className="h-3 w-3 mr-1" />}
          {riskLevel === "safe" && <ShieldCheck className="h-3 w-3 mr-1" />}
          In {Math.round(daysUntilStockout)} days
        </Badge>
      </div>

      {/* Semi-circular gauge */}
      <div className="flex justify-center">
        <div className="relative w-40 h-20 overflow-hidden">
          <svg viewBox="0 0 160 80" className="w-full h-full">
            {/* Background arc */}
            <path
              d="M 10 75 A 65 65 0 0 1 150 75"
              fill="none"
              stroke="#E5E7EB"
              strokeWidth="10"
              strokeLinecap="round"
            />
            {/* Colored arc segments */}
            <path
              d="M 10 75 A 65 65 0 0 1 56 18"
              fill="none"
              stroke="#EF4444"
              strokeWidth="10"
              strokeLinecap="round"
              opacity="0.3"
            />
            <path
              d="M 56 18 A 65 65 0 0 1 104 18"
              fill="none"
              stroke="#EAB308"
              strokeWidth="10"
              strokeLinecap="round"
              opacity="0.3"
            />
            <path
              d="M 104 18 A 65 65 0 0 1 150 75"
              fill="none"
              stroke="#22C55E"
              strokeWidth="10"
              strokeLinecap="round"
              opacity="0.3"
            />
            {/* Needle indicator */}
            <circle
              cx={10 + (140 * gaugePercent) / 100}
              cy={75 - Math.sin((gaugePercent / 100) * Math.PI) * 65}
              r="6"
              className={cn(
                "fill-current",
                riskLevel === "critical" && "text-status-red",
                riskLevel === "watch" && "text-status-yellow",
                riskLevel === "safe" && "text-status-green"
              )}
            />
          </svg>
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 text-center">
            <span className={cn("text-2xl font-bold tabular-nums", riskColors[riskLevel])}>
              {Math.round(daysUntilStockout)}
            </span>
            <span className="text-xs text-text-muted ml-1">days</span>
          </div>
        </div>
      </div>

      {/* Breakdown grid */}
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="bg-surface-secondary rounded-lg p-2.5">
          <p className="text-lg font-bold text-navy tabular-nums">{formatQuantity(available)}</p>
          <p className="text-[12px] text-text-muted uppercase tracking-wide">Available</p>
        </div>
        <div className="bg-surface-secondary rounded-lg p-2.5">
          <p className="text-lg font-bold text-navy tabular-nums">0</p>
          <p className="text-[12px] text-text-muted uppercase tracking-wide">Allocated</p>
        </div>
        <div className="bg-surface-secondary rounded-lg p-2.5">
          <p className="text-lg font-bold text-navy tabular-nums">{formatQuantity(safetyStock)}</p>
          <p className="text-[12px] text-text-muted uppercase tracking-wide">Safety Stock</p>
        </div>
      </div>

      {/* AI forecast callout */}
      <div className={cn("rounded-lg border p-3", riskBgColors[riskLevel])}>
        <p className="text-xs leading-relaxed">
          <span className="font-semibold">Based on {daysCovered}-day consumption trend:</span>{" "}
          {avgDaily > 0 ? (
            <>
              Using ~{formatQuantity(Math.round(avgDaily * 10) / 10)} {unitOfMeasure}/day.{" "}
              {daysUntilReorder > 0 ? (
                <>Reorder by <span className="font-semibold">{reorderDateStr}</span> to avoid stockout.</>
              ) : (
                <span className="font-semibold text-red-700">Below safety stock — reorder now.</span>
              )}
            </>
          ) : (
            "Consumption rate is too low to project."
          )}
        </p>
      </div>
    </Card>
  )
}
