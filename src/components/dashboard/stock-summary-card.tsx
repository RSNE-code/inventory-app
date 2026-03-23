"use client"

import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Package, DollarSign, AlertTriangle, XCircle } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import type { StockSummary } from "@/types"

export function StockSummaryCards({ summary }: { summary: StockSummary }) {
  return (
    <div className="space-y-3">
      {/* Featured metric — Inventory Value (full width) */}
      <Link href="/inventory">
        <Card className="px-5 py-5 rounded-xl border-border-custom shadow-brand hover:shadow-brand-md hover:-translate-y-0.5 transition-all duration-300 group animate-fade-in-up stagger-1 card-accent-blue overflow-hidden">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-muted text-xs font-semibold uppercase tracking-wide">Inventory Value</p>
              <p className="text-3xl font-extrabold text-navy tabular-nums tracking-tight mt-1">{formatCurrency(summary.totalValue)}</p>
            </div>
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-blue/12 group-hover:bg-brand-blue/20 transition-colors">
              <DollarSign className="h-6 w-6 text-brand-blue" />
            </div>
          </div>
          <div className="flex items-center gap-1.5 mt-3">
            <Package className="h-3.5 w-3.5 text-text-muted" />
            <p className="text-text-muted text-xs font-medium">{summary.totalProducts} products tracked</p>
          </div>
        </Card>
      </Link>

      {/* Alert cards row */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/inventory?status=low">
          <Card className="px-4 py-4 rounded-xl border-border-custom shadow-brand hover:shadow-brand-md hover:-translate-y-0.5 transition-all duration-300 group animate-fade-in-up stagger-2 card-accent-yellow overflow-hidden bg-status-yellow/[0.06]">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-status-yellow/15 group-hover:bg-status-yellow/25 transition-colors">
                <AlertTriangle className="h-[18px] w-[18px] text-status-yellow" />
              </div>
              <div className="min-w-0">
                <p className="text-xl font-extrabold text-navy tabular-nums tracking-tight leading-none">{summary.lowStockCount}</p>
                <p className="text-text-muted text-[12px] mt-1 font-medium">Low Stock</p>
              </div>
            </div>
          </Card>
        </Link>
        <Link href="/inventory?status=out">
          <Card className="px-4 py-4 rounded-xl border-border-custom shadow-brand hover:shadow-brand-md hover:-translate-y-0.5 transition-all duration-300 group animate-fade-in-up stagger-3 card-accent-red overflow-hidden bg-status-red/[0.06]">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-status-red/15 group-hover:bg-status-red/25 transition-colors">
                <XCircle className="h-[18px] w-[18px] text-status-red" />
              </div>
              <div className="min-w-0">
                <p className="text-xl font-extrabold text-navy tabular-nums tracking-tight leading-none">{summary.outOfStockCount}</p>
                <p className="text-text-muted text-[12px] mt-1 font-medium">Out of Stock</p>
              </div>
            </div>
          </Card>
        </Link>
      </div>
    </div>
  )
}
