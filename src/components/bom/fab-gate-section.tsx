"use client"

import { useEffect, useCallback, useState } from "react"
import { cn } from "@/lib/utils"
import { Wrench, Check, AlertTriangle, ExternalLink, Loader2 } from "lucide-react"
import type { FabCheckDoorItem } from "@/app/api/boms/[id]/fab-check/route"

interface FabGateSectionProps {
  bomId: string
  jobName: string
  onResolved: (allResolved: boolean) => void
}

const STATUS_LABELS: Record<string, string> = {
  PLANNED: "Planned",
  AWAITING_APPROVAL: "Awaiting Approval",
  APPROVED: "Approved",
  IN_PRODUCTION: "In Production",
  COMPLETED: "Completed",
  ALLOCATED: "Allocated",
  SHIPPED: "Shipped",
}

const TYPE_LABELS: Record<string, string> = {
  DOOR: "Door",
  FLOOR_PANEL: "Floor Panel",
  WALL_PANEL: "Wall Panel",
  RAMP: "Ramp",
}

const TYPE_CREATE_URLS: Record<string, string> = {
  DOOR: "DOOR",
  FLOOR_PANEL: "FLOOR_PANEL",
  WALL_PANEL: "WALL_PANEL",
  RAMP: "RAMP",
}

function QueueStatusBadge({ status }: { status: string }) {
  const label = STATUS_LABELS[status] || status
  const isGreen = ["APPROVED", "IN_PRODUCTION", "COMPLETED", "SHIPPED"].includes(status)
  const isBlue = ["AWAITING_APPROVAL", "PLANNED"].includes(status)

  return (
    <span className={cn(
      "inline-flex items-center px-2 py-0.5 rounded-xl text-[10px] font-bold uppercase tracking-wide",
      isGreen && "bg-status-green/15 text-status-green",
      isBlue && "bg-brand-blue/15 text-brand-blue",
      !isGreen && !isBlue && "bg-text-muted/15 text-text-muted",
    )}>
      {label}
    </span>
  )
}

export function FabGateSection({ bomId, jobName, onResolved }: FabGateSectionProps) {
  const [doorItems, setDoorItems] = useState<FabCheckDoorItem[]>([])
  const [loading, setLoading] = useState(true)

  const fetchFabCheck = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`/api/boms/${bomId}/fab-check`)
      if (!res.ok) return
      const json = await res.json()
      const items = json.data?.doorItems || []
      setDoorItems(items)
      onResolved(json.data?.allResolved ?? true)
    } catch {
      // Silently fail — don't block UX
    } finally {
      setLoading(false)
    }
  }, [bomId, onResolved])

  useEffect(() => {
    fetchFabCheck()
  }, [fetchFabCheck])

  // Re-fetch when user returns from door creation (page focus)
  useEffect(() => {
    function handleFocus() {
      fetchFabCheck()
    }
    window.addEventListener("focus", handleFocus)
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") handleFocus()
    })
    return () => {
      window.removeEventListener("focus", handleFocus)
    }
  }, [fetchFabCheck])

  if (loading) {
    return (
      <div className="flex items-center gap-2 p-4 rounded-xl bg-surface-secondary border border-border-custom">
        <Loader2 className="h-4 w-4 animate-spin text-text-muted" />
        <span className="text-sm text-text-muted">Checking fabrication items...</span>
      </div>
    )
  }

  if (doorItems.length === 0) return null

  const allResolved = doorItems.every((d) => d.status !== "unresolved")

  return (
    <div className="space-y-2">
      {/* Section header */}
      <div className="flex items-center gap-2 px-1">
        <Wrench className="h-4 w-4 text-brand-blue" />
        <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">
          Fabrication Items
        </span>
        {allResolved ? (
          <span className="ml-auto text-xs font-semibold text-status-green">All linked</span>
        ) : (
          <span className="ml-auto text-xs font-semibold text-brand-orange">Action needed</span>
        )}
      </div>

      {/* Door items */}
      {doorItems.map((item) => {
        const isResolved = item.status === "linked" || item.status === "matched"

        return (
          <div
            key={item.lineItemId}
            className={cn(
              "rounded-xl border p-3.5 transition-all",
              isResolved
                ? "border-status-green/30 bg-status-green/5 border-l-4 border-l-status-green"
                : "border-brand-orange/30 bg-brand-orange/5 border-l-4 border-l-brand-orange"
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {isResolved ? (
                    <div className="h-5 w-5 rounded-full bg-status-green flex items-center justify-center shrink-0">
                      <Check className="h-3 w-3 text-white" />
                    </div>
                  ) : (
                    <div className="h-5 w-5 rounded-full bg-brand-orange flex items-center justify-center shrink-0">
                      <AlertTriangle className="h-3 w-3 text-white" />
                    </div>
                  )}
                  <p className="text-[15px] font-semibold text-navy truncate">
                    {item.productName}
                  </p>
                </div>

                {isResolved && item.assembly && (
                  <div className="mt-1.5 ml-7 flex items-center gap-2">
                    <QueueStatusBadge status={item.assembly.status} />
                    <span className="text-xs text-text-muted">in {item.assemblyType === "DOOR" ? "Door Shop" : "Fab"} Queue</span>
                  </div>
                )}

                {!isResolved && (
                  <p className="mt-1 ml-7 text-xs text-brand-orange font-medium">
                    No matching {(TYPE_LABELS[item.assemblyType] || "item").toLowerCase()} in queue
                  </p>
                )}
              </div>

              {!isResolved && (
                <a
                  href={`/assemblies/new?type=${TYPE_CREATE_URLS[item.assemblyType] || "DOOR"}&jobName=${encodeURIComponent(jobName)}&doorHint=${encodeURIComponent(item.productName)}&fromBom=${bomId}`}
                  className="shrink-0 h-11 px-3.5 flex items-center gap-1.5 rounded-xl bg-brand-blue text-white text-xs font-semibold active:bg-brand-blue/80 ios-press transition-all"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Create {TYPE_LABELS[item.assemblyType] || "Item"}
                </a>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
