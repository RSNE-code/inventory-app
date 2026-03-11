"use client"

import Link from "next/link"
import { Card } from "@/components/ui/card"
import { Package, DollarSign, AlertTriangle, XCircle } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import type { StockSummary } from "@/types"

export function StockSummaryCards({ summary }: { summary: StockSummary }) {
  const cards = [
    {
      label: "Total Products",
      value: summary.totalProducts.toString(),
      icon: Package,
      color: "text-brand-blue",
      bg: "bg-brand-blue/8",
      bgHover: "group-hover:bg-brand-blue/14",
      href: "/inventory",
    },
    {
      label: "Inventory Value",
      value: formatCurrency(summary.totalValue),
      icon: DollarSign,
      color: "text-brand-blue",
      bg: "bg-brand-blue/8",
      bgHover: "group-hover:bg-brand-blue/14",
      href: "/inventory",
    },
    {
      label: "Low Stock",
      value: summary.lowStockCount.toString(),
      icon: AlertTriangle,
      color: "text-status-yellow",
      bg: "bg-status-yellow/8",
      bgHover: "group-hover:bg-status-yellow/14",
      href: "/inventory?status=low",
    },
    {
      label: "Out of Stock",
      value: summary.outOfStockCount.toString(),
      icon: XCircle,
      color: "text-status-red",
      bg: "bg-status-red/8",
      bgHover: "group-hover:bg-status-red/14",
      href: "/inventory?status=out",
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-4">
      {cards.map((card, i) => (
        <Link key={card.label} href={card.href}>
          <Card className={`px-4 py-4 rounded-xl border-border-custom shadow-brand hover:shadow-brand-md transition-all duration-300 group animate-fade-in-up stagger-${i + 1}`}>
            <div className="flex items-center gap-3">
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${card.bg} ${card.bgHover} transition-colors`}>
                <card.icon className={`h-[18px] w-[18px] ${card.color}`} />
              </div>
              <div className="min-w-0">
                <p className="text-xl font-extrabold text-navy tabular-nums tracking-tight leading-none truncate">{card.value}</p>
                <p className="text-text-muted text-[11px] mt-1 font-medium">{card.label}</p>
              </div>
            </div>
          </Card>
        </Link>
      ))}
    </div>
  )
}
