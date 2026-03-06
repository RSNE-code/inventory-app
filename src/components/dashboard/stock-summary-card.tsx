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
      bg: "bg-brand-blue/10",
      href: "/inventory",
    },
    {
      label: "Inventory Value",
      value: formatCurrency(summary.totalValue),
      icon: DollarSign,
      color: "text-brand-blue",
      bg: "bg-brand-blue/10",
      href: "/inventory",
    },
    {
      label: "Low Stock",
      value: summary.lowStockCount.toString(),
      icon: AlertTriangle,
      color: "text-status-yellow",
      bg: "bg-status-yellow/10",
      href: "/inventory?status=low",
    },
    {
      label: "Out of Stock",
      value: summary.outOfStockCount.toString(),
      icon: XCircle,
      color: "text-status-red",
      bg: "bg-status-red/10",
      href: "/inventory?status=out",
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3">
      {cards.map((card) => (
        <Link key={card.label} href={card.href}>
          <Card className="p-4 rounded-xl border-border-custom hover:shadow-md transition-shadow duration-200">
            <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${card.bg} mb-2`}>
              <card.icon className={`h-5 w-5 ${card.color}`} />
            </div>
            <p className="text-xl font-bold text-navy tabular-nums">{card.value}</p>
            <p className="text-text-muted text-xs mt-0.5">{card.label}</p>
          </Card>
        </Link>
      ))}
    </div>
  )
}
