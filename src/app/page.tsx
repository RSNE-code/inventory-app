"use client"

import { useDashboard } from "@/hooks/use-dashboard"
import { StockSummaryCards } from "@/components/dashboard/stock-summary-card"
import { LowStockList } from "@/components/dashboard/low-stock-list"
import { QuickActions } from "@/components/dashboard/quick-actions"
import { Card } from "@/components/ui/card"
import { formatQuantity } from "@/lib/utils"
import { Package, ClipboardList } from "lucide-react"
import Link from "next/link"

export default function DashboardPage() {
  const { data, isLoading } = useDashboard()
  const dashboard = data?.data

  const greeting = getGreeting()

  return (
    <div>
      {/* Header */}
      <header className="bg-navy px-4 pt-6 pb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-orange">
            <Package className="h-5 w-5 text-white" />
          </div>
          <div>
            <p className="text-white/70 text-sm">{greeting}</p>
            <h1 className="text-white text-xl font-bold">RSNE Inventory</h1>
          </div>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {isLoading ? (
          <div className="text-center py-12 text-text-muted">Loading dashboard...</div>
        ) : dashboard ? (
          <>
            <StockSummaryCards summary={dashboard.summary} />
            <QuickActions />

            {dashboard.activeBomCount > 0 && (
              <Link href="/boms">
                <Card className="p-4 rounded-xl border-border-custom hover:shadow-md transition-shadow">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50">
                      <ClipboardList className="h-5 w-5 text-brand-blue" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-navy">{dashboard.activeBomCount} Active BOM{dashboard.activeBomCount !== 1 ? "s" : ""}</p>
                      <p className="text-xs text-text-muted">Tap to view</p>
                    </div>
                  </div>
                </Card>
              </Link>
            )}

            <LowStockList items={dashboard.lowStockItems} />

            {/* Recent activity */}
            {dashboard.recentTransactions.length > 0 && (
              <Card className="p-4 rounded-xl border-border-custom">
                <h3 className="font-semibold text-navy mb-3">Recent Activity</h3>
                <div className="space-y-2">
                  {dashboard.recentTransactions.slice(0, 5).map((t) => (
                    <div key={t.id} className="flex items-center justify-between py-2 border-b border-border-custom last:border-0">
                      <div>
                        <p className="text-sm font-medium text-navy">{t.productName}</p>
                        <p className="text-xs text-text-muted">
                          {formatTransactionType(t.type)} by {t.userName}
                        </p>
                      </div>
                      <p className={`text-sm font-semibold tabular-nums ${
                        isPositiveType(t.type) ? "text-status-green" : "text-status-red"
                      }`}>
                        {isPositiveType(t.type) ? "+" : "-"}{formatQuantity(t.quantity)}
                      </p>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </>
        ) : (
          <div className="text-center py-12 text-text-muted">No data available</div>
        )}
      </div>
    </div>
  )
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  return "Good evening"
}

function formatTransactionType(type: string): string {
  const map: Record<string, string> = {
    RECEIVE: "Received",
    CHECKOUT: "Checked Out",
    ADDITIONAL_PICKUP: "Pickup",
    RETURN_FULL: "Returned",
    RETURN_PARTIAL: "Partial Return",
    RETURN_SCRAP: "Scrapped",
    CONSUME: "Consumed",
    PRODUCE: "Produced",
    SHIP: "Shipped",
    ADJUST_UP: "Adjusted +",
    ADJUST_DOWN: "Adjusted -",
  }
  return map[type] || type
}

function isPositiveType(type: string): boolean {
  return ["RECEIVE", "RETURN_FULL", "RETURN_PARTIAL", "PRODUCE", "ADJUST_UP"].includes(type)
}
