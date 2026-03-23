"use client"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

const statusConfig: Record<string, { label: string; dot: string; className: string }> = {
  DRAFT: { label: "Draft", dot: "bg-text-muted", className: "bg-surface-secondary text-text-secondary border-0" },
  PENDING_REVIEW: { label: "Pending Review", dot: "bg-brand-orange animate-pulse", className: "bg-brand-orange/15 text-brand-orange border-0" },
  APPROVED: { label: "Approved", dot: "bg-brand-blue", className: "bg-brand-blue/15 text-brand-blue border-0" },
  IN_PROGRESS: { label: "In Progress", dot: "bg-status-yellow animate-pulse", className: "bg-status-yellow/15 text-status-yellow border-0" },
  COMPLETED: { label: "Completed", dot: "bg-status-green", className: "bg-status-green/15 text-status-green border-0" },
  CANCELLED: { label: "Cancelled", dot: "bg-status-red", className: "bg-status-red/15 text-status-red border-0" },
}

export function BomStatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] || statusConfig.DRAFT
  return (
    <Badge variant="outline" className={cn("text-xs font-semibold gap-1.5 px-2.5 py-1", config.className)}>
      <span className={cn("h-2 w-2 rounded-full shrink-0", config.dot)} />
      {config.label}
    </Badge>
  )
}
