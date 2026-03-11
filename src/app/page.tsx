"use client"

import { useDashboard } from "@/hooks/use-dashboard"
import { StockSummaryCards } from "@/components/dashboard/stock-summary-card"
import { LowStockList } from "@/components/dashboard/low-stock-list"
import { QuickActions } from "@/components/dashboard/quick-actions"
import { Card } from "@/components/ui/card"
import { formatQuantity } from "@/lib/utils"
import { ClipboardList, AlertTriangle, AlertCircle, Info, Factory } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { cn } from "@/lib/utils"

const alertIcons: Record<string, typeof AlertTriangle> = {
  critical: AlertCircle,
  warning: AlertTriangle,
  info: Info,
}

const alertStyles: Record<string, string> = {
  critical: "border-l-status-red bg-red-50/60 text-red-700",
  warning: "border-l-status-yellow bg-yellow-50/60 text-yellow-700",
  info: "border-l-brand-blue bg-blue-50/60 text-blue-700",
}

export default function DashboardPage() {
  const { data, isLoading, error, refetch } = useDashboard()
  const dashboard = data?.data

  const greeting = getGreeting()

  return (
    <div>
      {/* Hero Header */}
      <header className="relative bg-navy px-4 pt-7 pb-6 overflow-hidden">
        {/* Subtle gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-navy via-navy to-navy-light opacity-90" />
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-4 animate-fade-in">
            <div className="rounded-lg bg-white px-2 py-1 shrink-0 shadow-brand">
              <Image
                src="/logo.jpg"
                alt="RSNE"
                width={100}
                height={40}
                className="h-8 w-auto"
                priority
              />
            </div>
          </div>
          <p className="text-white/50 text-sm font-medium tracking-wide uppercase animate-fade-in-up stagger-1">{greeting}</p>
          <h1 className="text-white text-3xl font-extrabold tracking-tight animate-fade-in-up stagger-2">Inventory</h1>
        </div>
      </header>

      <div className="p-4 space-y-5">
        {isLoading ? (
          <div className="space-y-4">
            {/* Skeleton loaders */}
            <div className="grid grid-cols-2 gap-3">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className={cn("h-28 rounded-xl bg-surface-secondary animate-pulse", `stagger-${i + 1}`)}>
                  <div className="p-4 space-y-3">
                    <div className="h-9 w-9 rounded-lg bg-border-custom/50" />
                    <div className="h-5 w-16 rounded bg-border-custom/50" />
                    <div className="h-3 w-20 rounded bg-border-custom/30" />
                  </div>
                </div>
              ))}
            </div>
            <div className="h-16 rounded-xl bg-surface-secondary animate-pulse" />
          </div>
        ) : dashboard ? (
          <>
            {/* Stock Summary */}
            <div className="animate-fade-in-up stagger-1">
              <StockSummaryCards summary={dashboard.summary} />
            </div>

            {/* Quick Actions */}
            <div className="animate-fade-in-up stagger-3">
              <QuickActions />
            </div>

            {/* Alerts — slide in from right */}
            {dashboard.alerts && dashboard.alerts.length > 0 && (
              <div className="space-y-2">
                {dashboard.alerts.map((alert: { type: string; title: string; message: string; link?: string }, index: number) => {
                  const Icon = alertIcons[alert.type] || Info
                  const card = (
                    <Card className={cn(
                      "p-3 rounded-xl border-l-4 border-t-0 border-r-0 border-b-0 shadow-brand animate-slide-in-right",
                      alertStyles[alert.type] || alertStyles.info,
                      `stagger-${index + 1}`
                    )}>
                      <div className="flex items-start gap-2.5">
                        <Icon className={cn(
                          "h-4 w-4 mt-0.5 shrink-0",
                          alert.type === "critical" && "badge-critical-pulse"
                        )} />
                        <div>
                          <p className="text-sm font-semibold">{alert.title}</p>
                          <p className="text-xs opacity-70 mt-0.5">{alert.message}</p>
                        </div>
                      </div>
                    </Card>
                  )

                  return alert.link ? (
                    <Link key={index} href={alert.link}>{card}</Link>
                  ) : (
                    <div key={index}>{card}</div>
                  )
                })}
              </div>
            )}

            {/* Secondary cards grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Active BOMs */}
              {dashboard.activeBomCount > 0 && (
                <Link href="/boms" className="animate-fade-in-up stagger-5">
                  <Card className="p-4 rounded-xl border-border-custom hover:shadow-brand-md transition-shadow duration-300 h-full group">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-blue/8 group-hover:bg-brand-blue/12 transition-colors">
                        <ClipboardList className="h-5 w-5 text-brand-blue" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-navy tabular-nums">{dashboard.activeBomCount}</p>
                        <p className="text-xs text-text-muted font-medium">Active BOM{dashboard.activeBomCount !== 1 ? "s" : ""}</p>
                      </div>
                    </div>
                  </Card>
                </Link>
              )}

              {/* Fabrication Status */}
              {dashboard.fabrication && (dashboard.fabrication.inProduction > 0 || dashboard.fabrication.completed > 0 || dashboard.fabrication.pendingApprovals > 0) && (
                <Link href="/assemblies" className="animate-fade-in-up stagger-6">
                  <Card className="p-4 rounded-xl border-border-custom hover:shadow-brand-md transition-shadow duration-300 h-full group">
                    <div className="flex items-center gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-orange/8 group-hover:bg-brand-orange/12 transition-colors">
                        <Factory className="h-5 w-5 text-brand-orange" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-navy">Fabrication</p>
                        <div className="flex gap-3 text-xs mt-0.5">
                          {dashboard.fabrication.pendingApprovals > 0 && (
                            <span className="text-status-yellow font-semibold">{dashboard.fabrication.pendingApprovals} pending</span>
                          )}
                          {dashboard.fabrication.inProduction > 0 && (
                            <span className="text-brand-orange font-semibold">{dashboard.fabrication.inProduction} building</span>
                          )}
                          {dashboard.fabrication.completed > 0 && (
                            <span className="text-status-green font-semibold">{dashboard.fabrication.completed} done</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                </Link>
              )}
            </div>

            {/* Low stock + Recent activity */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="animate-fade-in-up stagger-7">
                <LowStockList items={dashboard.lowStockItems} />
              </div>

              {/* Recent activity */}
              {dashboard.recentTransactions.length > 0 && (
                <div className="animate-fade-in-up stagger-8">
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
