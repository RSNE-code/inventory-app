"use client"

import { useState } from "react"
import { useDashboard } from "@/hooks/use-dashboard"
import { StockSummaryCards } from "@/components/dashboard/stock-summary-card"
import { ActionItems } from "@/components/dashboard/action-items"
import { WorkPipelines } from "@/components/dashboard/work-pipelines"
import { LowStockList } from "@/components/dashboard/low-stock-list"
import { Card } from "@/components/ui/card"
import { formatQuantity } from "@/lib/utils"
import { InventoryTrendChart } from "@/components/dashboard/inventory-trend-chart"
import { AlertCircle, Menu, Settings, ClipboardCheck, X } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { useMe } from "@/hooks/use-me"
import type { DashboardData } from "@/types"

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return "Good morning"
  if (hour < 17) return "Good afternoon"
  return "Good evening"
}

function getActionSummary(d: DashboardData): { text: string; urgent: boolean } {
  const approvals = d.fabrication?.pendingApprovals || 0
  if (approvals > 0) return { text: `${approvals} door${approvals !== 1 ? "s" : ""} awaiting approval`, urgent: true }
  const review = d.bomStatusCounts?.PENDING_REVIEW || 0
  if (review > 0) return { text: `${review} BOM${review !== 1 ? "s" : ""} need${review === 1 ? "s" : ""} review`, urgent: true }
  const low = d.summary?.lowStockCount || 0
  if (low > 0) return { text: `${low} item${low !== 1 ? "s" : ""} running low`, urgent: true }
  return { text: "All clear — you're caught up", urgent: false }
}

export default function DashboardPage() {
  const { data, isLoading, error, refetch } = useDashboard()
  const dashboard = data?.data
  const [menuOpen, setMenuOpen] = useState(false)
  const { data: meData } = useMe()
  const firstName = meData?.data?.name?.split(" ")[0] || ""
  const greeting = getGreeting()
  const action = dashboard ? getActionSummary(dashboard) : null

  return (
    <div>
      {/* Branded Header — greeting + action summary */}
      <header className="relative bg-navy px-4 pt-[env(safe-area-inset-top)] z-50">
        <div className="absolute inset-0 bg-gradient-to-br from-navy via-navy to-navy-light opacity-90" />
        <div className="relative z-10 pb-3">
          {/* Top row: logo + menu */}
          <div className="flex items-center justify-between">
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
            </div>
            {/* Menu button */}
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex h-11 w-11 items-center justify-center rounded-xl text-white/70 hover:text-white hover:bg-white/15 transition-all duration-300"
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
          {/* Greeting + action summary */}
          <div className="mt-1 animate-fade-in">
            <h1 className="text-white text-xl font-bold tracking-tight font-display">
              {greeting}{firstName ? `, ${firstName}` : ""}
            </h1>
            {action && (
              <p className="text-sm text-white/60 mt-0.5 flex items-center gap-1.5">
                <span className={`inline-block h-1.5 w-1.5 rounded-full shrink-0 ${action.urgent ? "bg-brand-orange" : "bg-status-green"}`} />
                {action.text}
              </p>
            )}
          </div>
        </div>
      </header>

      <div className="p-4 space-y-4 pb-24">
        {isLoading ? (
          <div className="space-y-4">
            {/* Skeleton loaders matching new layout */}
            <div className="h-24 rounded-xl skeleton-shimmer stagger-1" />
            <div className="grid grid-cols-2 gap-3">
              <div className="h-36 rounded-xl skeleton-shimmer stagger-2" />
              <div className="h-36 rounded-xl skeleton-shimmer stagger-3" />
            </div>
            <div className="h-24 rounded-xl skeleton-shimmer stagger-4" />
            <div className="h-48 rounded-xl skeleton-shimmer stagger-5" />
          </div>
        ) : dashboard ? (
          <>
            {/* Section 1: Needs Attention (urgency zone) */}
            <div className="animate-fade-in-up stagger-1">
              <ActionItems
                bomStatusCounts={dashboard.bomStatusCounts || {}}
                doorQueueCount={dashboard.doorQueueCount || 0}
                lowStockCount={dashboard.summary.lowStockCount}
                outOfStockCount={dashboard.summary.outOfStockCount}
                pendingApprovals={dashboard.fabrication?.pendingApprovals || 0}
              />
            </div>

            {/* Section 2: Work Pipelines (BOM + Fabrication) */}
            <div className="animate-fade-in-up stagger-2">
              <WorkPipelines
                bomStatusCounts={dashboard.bomStatusCounts || {}}
                fabrication={dashboard.fabrication || { pendingApprovals: 0, inProduction: 0, completed: 0 }}
                doorQueueCount={dashboard.doorQueueCount || 0}
              />
            </div>

            {/* Section 3: Inventory Value (context) */}
            <div className="animate-fade-in-up stagger-3">
              <StockSummaryCards summary={dashboard.summary} />
            </div>

            {/* Section 4: Low Stock List */}
            <div className="animate-fade-in-up stagger-4">
              <LowStockList items={dashboard.lowStockItems} />
            </div>

            {/* Section 5: Inventory Trend Chart */}
            <div className="animate-fade-in-up stagger-5">
              <InventoryTrendChart />
            </div>

            {/* Section 6: Recent Activity */}
            {dashboard.recentTransactions.length > 0 && (
              <div className="animate-fade-in-up stagger-6">
                <Card className="p-4 rounded-xl border-border-custom shadow-brand">
                  <h3 className="font-semibold text-navy mb-3 text-base tracking-tight font-display">Recent Activity</h3>
                  <div className="space-y-0">
                    {dashboard.recentTransactions.slice(0, 5).map((t: { id: string; type: string; productName: string; quantity: number; userName: string }, i: number) => (
                      <div key={t.id} className={`flex items-center justify-between py-3.5 border-b border-border-custom/60 last:border-0 animate-fade-in-up stagger-${Math.min(i + 1, 12)}`}>
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
          </>
        ) : error ? (
          <div className="text-center py-16 animate-fade-in">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-status-red/10 mx-auto mb-4">
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
