"use client"

import Link from "next/link"
import { Card } from "@/components/ui/card"
import { ChevronRight, AlertTriangle, XCircle, ClipboardList, Factory, CheckCircle } from "lucide-react"
import { cn } from "@/lib/utils"

interface ActionItemsProps {
  bomStatusCounts: Record<string, number>
  doorQueueCount: number
  lowStockCount: number
  outOfStockCount: number
  pendingApprovals: number
}

interface ActionRow {
  label: string
  count: number
  href: string
  severity: "critical" | "warning" | "info"
  icon: typeof AlertTriangle
}

export function ActionItems({
  bomStatusCounts,
  doorQueueCount,
  lowStockCount,
  outOfStockCount,
  pendingApprovals,
}: ActionItemsProps) {
  const rows: ActionRow[] = []

  if (outOfStockCount > 0) {
    rows.push({
      label: `${outOfStockCount} item${outOfStockCount !== 1 ? "s" : ""} out of stock`,
      count: outOfStockCount,
      href: "/inventory?status=out",
      severity: "critical",
      icon: XCircle,
    })
  }

  if (lowStockCount > 0) {
    rows.push({
      label: `${lowStockCount} item${lowStockCount !== 1 ? "s" : ""} need reorder`,
      count: lowStockCount,
      href: "/reorder",
      severity: "warning",
      icon: AlertTriangle,
    })
  }

  const pendingReview = bomStatusCounts.PENDING_REVIEW || 0
  if (pendingReview > 0) {
    rows.push({
      label: `${pendingReview} BOM${pendingReview !== 1 ? "s" : ""} pending review`,
      count: pendingReview,
      href: "/boms",
      severity: "info",
      icon: ClipboardList,
    })
  }

  if (pendingApprovals > 0) {
    rows.push({
      label: `${pendingApprovals} door${pendingApprovals !== 1 ? "s" : ""} awaiting approval`,
      count: pendingApprovals,
      href: "/assemblies",
      severity: "info",
      icon: Factory,
    })
  }

  const severityStyles = {
    critical: { dot: "bg-status-red", text: "text-status-red" },
    warning: { dot: "bg-status-yellow", text: "text-status-yellow" },
    info: { dot: "bg-brand-blue", text: "text-brand-blue" },
  }

  // All clear state
  if (rows.length === 0) {
    return (
      <Card className="px-4 py-5 rounded-xl border-border-custom shadow-brand card-accent-green overflow-hidden">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-status-green/15">
            <CheckCircle className="h-5 w-5 text-status-green" />
          </div>
          <div>
            <p className="text-base font-bold text-navy">All Clear</p>
            <p className="text-xs text-text-muted font-medium mt-0.5">Nothing needs your attention right now</p>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="rounded-xl border-border-custom shadow-brand card-accent-orange overflow-hidden bg-brand-orange/[0.04]">
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-navy tracking-tight">Needs Attention</h3>
          <span className="text-xs font-bold text-brand-orange bg-brand-orange/15 px-2 py-0.5 rounded-full">{rows.length}</span>
        </div>
      </div>
      <div>
        {rows.map((row, i) => {
          const styles = severityStyles[row.severity]
          const Icon = row.icon
          return (
            <Link key={row.href + row.label} href={row.href}>
              <div className={cn(
                "flex items-center gap-3 px-4 min-h-[48px] py-3 transition-all duration-300 active:bg-brand-orange/10",
                i < rows.length - 1 && "border-b border-border-custom/40"
              )}>
                <span className={cn("h-2 w-2 rounded-full shrink-0", styles.dot)} />
                <Icon className={cn("h-4 w-4 shrink-0", styles.text)} />
                <p className="text-sm font-semibold text-navy flex-1">{row.label}</p>
                <ChevronRight className="h-4 w-4 text-text-muted/40" />
              </div>
            </Link>
          )
        })}
      </div>
    </Card>
  )
}
