"use client"

import { AlertTriangle, Wrench, ExternalLink, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { PreFabCheckItem, UnmatchedQueueItem } from "@/app/api/boms/fab-check-items/route"

const TYPE_LABELS: Record<string, string> = {
  DOOR: "Door",
  FLOOR_PANEL: "Floor Panel",
  WALL_PANEL: "Wall Panel",
  RAMP: "Ramp",
}

interface CreationFabWarningProps {
  unresolvedDoors: PreFabCheckItem[]
  unmatchedQueueItems?: UnmatchedQueueItem[]
  jobName: string
  onDismiss: () => void
  onCreateAnyway: () => void
  onAddQueueItem?: (item: UnmatchedQueueItem) => void
  isPending: boolean
}

export function CreationFabWarning({
  unresolvedDoors,
  unmatchedQueueItems = [],
  jobName,
  onDismiss,
  onCreateAnyway,
  onAddQueueItem,
  isPending,
}: CreationFabWarningProps) {
  const hasUnresolved = unresolvedDoors.length > 0
  const hasUnmatched = unmatchedQueueItems.length > 0

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in-up">
      <div className="w-full max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-brand-lg animate-ios-spring-in overflow-hidden max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="px-5 pt-5 pb-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-brand-orange/15 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-5 w-5 text-brand-orange" />
            </div>
            <div>
              <h3 className="text-base font-bold text-navy">Fabrication Check</h3>
              <p className="text-xs text-text-muted mt-0.5">
                {hasUnresolved && hasUnmatched
                  ? "Some fab items need attention before creating this BOM."
                  : hasUnresolved
                  ? "These fab items don\u2019t have matching entries in the shop queue yet."
                  : "There are fab items in the queue not included in this BOM."}
              </p>
            </div>
          </div>
        </div>

        {/* Unresolved items — BOM has fab items not in queue */}
        {hasUnresolved && (
          <div className="px-5 pb-3 space-y-2">
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wide px-1">Not in queue</p>
            {unresolvedDoors.map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-brand-orange/8 border border-brand-orange/20"
              >
                <Wrench className="h-4 w-4 text-brand-orange shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-semibold text-navy truncate block">
                    {item.productName}
                  </span>
                  <span className="text-[10px] text-text-muted font-medium">
                    {TYPE_LABELS[item.assemblyType] || item.assemblyType}
                  </span>
                </div>
                <a
                  href={`/assemblies/new?type=${item.assemblyType}&jobName=${encodeURIComponent(jobName)}&doorHint=${encodeURIComponent(item.productName)}`}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-brand-blue text-white text-xs font-semibold hover:bg-brand-blue/90 active:scale-[0.97] transition-all shrink-0"
                >
                  Create
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            ))}
          </div>
        )}

        {/* Unmatched queue items — queue has fab items not in BOM */}
        {hasUnmatched && (
          <div className="px-5 pb-3 space-y-2">
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wide px-1">In queue but not on BOM</p>
            {unmatchedQueueItems.map((item) => (
              <div
                key={item.assemblyId}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-brand-blue/8 border border-brand-blue/20"
              >
                <Wrench className="h-4 w-4 text-brand-blue shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-semibold text-navy truncate block">
                    {item.typeName}
                  </span>
                  <span className="text-[10px] text-text-muted font-medium">
                    {item.status.replace(/_/g, " ")}
                  </span>
                </div>
                {onAddQueueItem && (
                  <button
                    type="button"
                    onClick={() => onAddQueueItem(item)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-brand-blue text-white text-xs font-semibold hover:bg-brand-blue/90 active:scale-[0.97] transition-all shrink-0"
                  >
                    <Plus className="h-3 w-3" />
                    Add to BOM
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Hint */}
        <div className="px-5 pb-3">
          <p className="text-xs text-text-muted bg-surface-secondary rounded-xl px-3 py-2">
            Creating fab entries now ensures fabrication starts on time. You can also save as draft and add them later.
          </p>
        </div>

        {/* Actions */}
        <div className="px-5 pb-5 space-y-2">
          <Button
            onClick={onCreateAnyway}
            disabled={isPending}
            className="w-full h-12 rounded-xl bg-brand-orange hover:bg-brand-orange-hover text-white font-semibold"
          >
            {isPending ? "Creating..." : "Create BOM Anyway"}
          </Button>
          <Button
            onClick={onDismiss}
            variant="outline"
            className="w-full h-12 rounded-xl border-2 border-border-custom text-text-muted font-semibold"
          >
            Go Back
          </Button>
        </div>
      </div>
    </div>
  )
}
