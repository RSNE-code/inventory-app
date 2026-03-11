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
    <div className="grid grid-cols-2 gap-3">
      {cards.map((card, i) => (
        <Link key={card.label} href={card.href}>
          <Card className={`p-4 rounded-xl border-border-custom shadow-brand hover:shadow-brand-md transition-all duration-300 group animate-fade-in-up stagger-${i + 1}`}>
            <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${card.bg} ${card.bgHover} mb-3 transition-colors`}>
              <card.icon className={`h-4.5 w-4.5 ${card.color}`} />
            </div>
            <p className="text-2xl font-extrabold text-navy tabular-nums tracking-tight leading-none animate-count-reveal">{card.value}</p>
            <p className="text-text-muted text-xs mt-1.5 font-medium">{card.label}</p>
          </Card>
        </Link>
      ))}
    </div>
  )
}
