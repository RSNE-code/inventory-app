"use client"

import Link from "next/link"
import { Card } from "@/components/ui/card"
import { DollarSign } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import type { StockSummary } from "@/types"

export function StockSummaryCards({ summary }: { summary: StockSummary }) {
  return (
    <Link href="/inventory">
      <Card className="px-5 py-5 rounded-xl border-border-custom shadow-brand hover:shadow-brand-md hover:-translate-y-0.5 transition-all duration-300 group card-accent-blue overflow-hidden">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-text-muted text-xs font-semibold uppercase tracking-wide">Inventory Value</p>
            <p className="text-3xl font-extrabold text-navy tabular-nums tracking-tight mt-1">{formatCurrency(summary.totalValue)}</p>
          </div>
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-blue/12 group-hover:bg-brand-blue/20 transition-colors">
            <DollarSign className="h-6 w-6 text-brand-blue" />
          </div>
        </div>
        <p className="text-text-muted text-xs font-medium mt-3">
          {summary.totalProducts} products
          {summary.lowStockCount > 0 && <span className="text-status-yellow"> · {summary.lowStockCount} low stock</span>}
          {summary.outOfStockCount > 0 && <span className="text-status-red"> · {summary.outOfStockCount} out</span>}
        </p>
      </Card>
    </Link>
  )
}
