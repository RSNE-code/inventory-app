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
  critical: "bg-red-50 border-red-200 text-red-700",
  warning: "bg-yellow-50 border-yellow-200 text-yellow-700",
  info: "bg-blue-50 border-blue-200 text-blue-700",
}

export default function DashboardPage() {
  const { data, isLoading } = useDashboard()
  const dashboard = data?.data

  const greeting = getGreeting()

  return (
    <div>
      {/* Header */}
      <header className="bg-navy px-4 pt-6 pb-5">
        <div className="flex items-center gap-3">
          <div className="rounded bg-white px-1.5 py-0.5 shrink-0">
            <Image
              src="/logo.jpg"
              alt="RSNE"
              width={100}
              height={40}
              className="h-8 w-auto"
              priority
            />
          </div>
          <div>
            <p className="text-white/70 text-sm">{greeting}</p>
            <h1 className="text-white text-xl font-bold">Inventory</h1>
          </div>
        </div>
      </header>

      <div className="p-4 space-y-4">
        {isLoading ? (
          <div className="text-center py-12 text-text-muted">Loading dashboard...</div>
        ) : dashboard ? (
          <>
            {/* Full-width items */}
            <StockSummaryCards summary={dashboard.summary} />
            <QuickActions />

            {/* Alerts — full width */}
            {dashboard.alerts && dashboard.alerts.length > 0 && (
              <div className="space-y-2">
                {dashboard.alerts.map((alert: { type: string; title: string; message: string; link?: string }, index: number) => {
                  const Icon = alertIcons[alert.type] || Info
                  const card = (
                    <Card className={cn(
                      "p-3 rounded-xl border",
                      alertStyles[alert.type] || alertStyles.info
                    )}>
                      <div className="flex items-start gap-2.5">
                        <Icon className="h-4 w-4 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-sm font-semibold">{alert.title}</p>
                          <p className="text-xs opacity-80">{alert.message}</p>
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

            {/* Responsive grid for secondary cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Active BOMs */}
              {dashboard.activeBomCount > 0 && (
                <Link href="/boms">
                  <Card className="p-4 rounded-xl border-border-custom hover:shadow-md transition-shadow h-full">
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

              {/* Fabrication Status */}
              {dashboard.fabrication && (dashboard.fabrication.inProduction > 0 || dashboard.fabrication.completed > 0 || dashboard.fabrication.pendingApprovals > 0) && (
                <Link href="/assemblies">
                  <Card className="p-4 rounded-xl border-border-custom hover:shadow-md transition-shadow h-full">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50">
                        <Factory className="h-5 w-5 text-brand-orange" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-navy">Fabrication</p>
                        <div className="flex gap-3 text-xs text-text-muted">
                          {dashboard.fabrication.pendingApprovals > 0 && (
                            <span className="text-yellow-600">{dashboard.fabrication.pendingApprovals} pending</span>
                          )}
                          {dashboard.fabrication.inProduction > 0 && (
                            <span className="text-orange-600">{dashboard.fabrication.inProduction} building</span>
                          )}
                          {dashboard.fabrication.completed > 0 && (
                            <span className="text-green-600">{dashboard.fabrication.completed} done</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                </Link>
              )}
            </div>

            {/* Two-column on desktop for low stock + recent activity */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <LowStockList items={dashboard.lowStockItems} />
              </div>

              {/* Recent activity */}
              {dashboard.recentTransactions.length > 0 && (
                <Card className="p-4 rounded-xl border-border-custom">
                  <h3 className="font-semibold text-navy mb-3">Recent Activity</h3>
                  <div className="space-y-2">
                    {dashboard.recentTransactions.slice(0, 5).map((t: { id: string; type: string; productName: string; quantity: number; userName: string }) => (
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
            </div>
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
