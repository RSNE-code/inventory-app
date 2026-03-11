"use client"

import { useState } from "react"
import { useDashboard } from "@/hooks/use-dashboard"
import { StockSummaryCards } from "@/components/dashboard/stock-summary-card"
import { LowStockList } from "@/components/dashboard/low-stock-list"
import { Card } from "@/components/ui/card"
import { formatQuantity } from "@/lib/utils"
import { InventoryTrendChart } from "@/components/dashboard/inventory-trend-chart"
import { ClipboardList, AlertCircle, Factory, Menu, Settings, ClipboardCheck, X } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { cn } from "@/lib/utils"

export default function DashboardPage() {
  const { data, isLoading, error, refetch } = useDashboard()
  const dashboard = data?.data
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div>
      {/* Compact Header — logo + title inline */}
      <header className="relative bg-navy px-4 py-3 z-50">
        <div className="absolute inset-0 bg-gradient-to-br from-navy via-navy to-navy-light opacity-90" />
        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-3 animate-fade-in">
            <div className="rounded-lg bg-white px-2 py-1 shrink-0 shadow-brand">
              <Image
                src="/logo.jpg"
                alt="RSNE"
                width={100}
                height={40}
                className="h-7 w-auto"
                priority
              />
            </div>
            <h1 className="text-white text-xl font-bold tracking-tight">Inventory Dashboard</h1>
          </div>
          {/* Menu button — opens additional options */}
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="flex h-9 w-9 items-center justify-center rounded-xl text-white/70 hover:text-white hover:bg-white/10 transition-all"
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-brand-md border border-border-custom z-50 py-1 animate-fade-in">
                  <Link
                    href="/cycle-counts"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-navy hover:bg-surface-secondary transition-colors"
                  >
                    <ClipboardCheck className="h-4 w-4 text-text-muted" />
                    Cycle Counts
                  </Link>
                  <Link
                    href="/settings"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-navy hover:bg-surface-secondary transition-colors"
                  >
                    <Settings className="h-4 w-4 text-text-muted" />
                    Settings
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <div className="p-4 space-y-3">
        {isLoading ? (
          <div className="space-y-4">
            {/* Skeleton loaders */}
            <div className="grid grid-cols-2 gap-4">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className={cn("h-16 rounded-xl bg-surface-secondary animate-pulse", `stagger-${i + 1}`)} />
              ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="h-20 rounded-xl bg-surface-secondary animate-pulse" />
              <div className="h-20 rounded-xl bg-surface-secondary animate-pulse" />
            </div>
          </div>
        ) : dashboard ? (
          <>
            {/* Stock Summary Cards */}
            <div className="animate-fade-in-up stagger-1">
              <StockSummaryCards summary={dashboard.summary} />
            </div>

            {/* Active BOMs + Fabrication — same grid as stock cards */}
            <div className="grid grid-cols-2 gap-4 animate-fade-in-up stagger-3">
              <Link href="/boms">
                <Card className="px-4 py-4 rounded-xl border-border-custom shadow-brand hover:shadow-brand-md transition-all duration-300 group">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-blue/8 group-hover:bg-brand-blue/14 transition-colors">
                      <ClipboardList className="h-[18px] w-[18px] text-brand-blue" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xl font-extrabold text-navy tabular-nums tracking-tight leading-none">{dashboard.activeBomCount}</p>
                      <p className="text-text-muted text-[11px] mt-1 font-medium">Active BOMs</p>
                    </div>
                  </div>
                </Card>
              </Link>

              <Link href="/assemblies">
                <Card className="px-4 py-4 rounded-xl border-border-custom shadow-brand hover:shadow-brand-md transition-all duration-300 group">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-orange/8 group-hover:bg-brand-orange/14 transition-colors">
                      <Factory className="h-[18px] w-[18px] text-brand-orange" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xl font-extrabold text-navy tabular-nums tracking-tight leading-none">{dashboard.fabrication ? dashboard.fabrication.inProduction + dashboard.fabrication.pendingApprovals : 0}</p>
                      <p className="text-text-muted text-[11px] mt-1 font-medium">Active Builds</p>
                    </div>
                  </div>
                </Card>
              </Link>
            </div>

            {/* Inventory Value Trend Chart */}
            <div className="animate-fade-in-up stagger-4">
              <InventoryTrendChart />
            </div>

            {/* Low stock + Recent activity */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="animate-fade-in-up stagger-5">
                <LowStockList items={dashboard.lowStockItems} />
              </div>

              {dashboard.recentTransactions.length > 0 && (
                <div className="animate-fade-in-up stagger-6">
                  <Card className="p-4 rounded-xl border-border-custom shadow-brand">
                    <h3 className="font-semibold text-navy mb-3 text-sm tracking-tight">Recent Activity</h3>
                    <div className="space-y-0">
                      {dashboard.recentTransactions.slice(0, 5).map((t: { id: string; type: string; productName: string; quantity: number; userName: string }) => (
                        <div key={t.id} className="flex items-center justify-between py-2.5 border-b border-border-custom/60 last:border-0">
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-navy truncate">{t.productName}</p>
                            <p className="text-xs text-text-muted mt-0.5">
                              {formatTransactionType(t.type)} by {t.userName}
                            </p>
                          </div>
                          <p className={`text-sm font-bold tabular-nums ml-3 ${
                            isPositiveType(t.type) ? "text-status-green" : "text-status-red"
                          }`}>
                            {isPositiveType(t.type) ? "+" : "-"}{formatQuantity(t.quantity)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>
              )}
            </div>
          </>
        ) : error ? (
          <div className="text-center py-16 animate-fade-in">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-50 mx-auto mb-4">
              <AlertCircle className="h-8 w-8 text-status-red" />
            </div>
            <p className="text-text-secondary font-medium mb-1">Something went wrong</p>
            <p className="text-text-muted text-sm mb-4">Failed to load dashboard data</p>
            <button
              onClick={() => refetch()}
              className="px-5 py-2.5 text-sm font-semibold text-white bg-brand-orange hover:bg-brand-orange-hover rounded-xl transition-colors"
            >
              Try again
            </button>
          </div>
        ) : (
          <div className="text-center py-16 text-text-muted animate-fade-in">
            <p className="font-medium">No data available</p>
          </div>
        )}
      </div>
    </div>
  )
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
