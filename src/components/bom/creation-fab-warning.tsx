"use client"

import { AlertTriangle, DoorOpen, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { PreFabCheckItem } from "@/app/api/boms/fab-check-items/route"

interface CreationFabWarningProps {
  unresolvedDoors: PreFabCheckItem[]
  jobName: string
  onDismiss: () => void
  onCreateAnyway: () => void
  isPending: boolean
}

export function CreationFabWarning({
  unresolvedDoors,
  jobName,
  onDismiss,
  onCreateAnyway,
  isPending,
}: CreationFabWarningProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in-up">
      <div className="w-full max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-brand-lg animate-ios-spring-in overflow-hidden">
        {/* Header */}
        <div className="px-5 pt-5 pb-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-brand-orange/15 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-5 w-5 text-brand-orange" />
            </div>
            <div>
              <h3 className="text-base font-bold text-navy">Doors Not in Queue</h3>
              <p className="text-xs text-text-muted mt-0.5">
                These door items don&apos;t have a matching door sheet in the shop queue yet.
              </p>
            </div>
          </div>
        </div>

        {/* Door list */}
        <div className="px-5 pb-3 space-y-2">
          {unresolvedDoors.map((door, i) => (
            <div
              key={i}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-brand-orange/8 border border-brand-orange/20"
            >
              <DoorOpen className="h-4 w-4 text-brand-orange shrink-0" />
              <span className="text-sm font-semibold text-navy flex-1 min-w-0 truncate">
                {door.productName}
              </span>
              <a
                href={`/assemblies/new?type=DOOR&jobName=${encodeURIComponent(jobName)}&doorHint=${encodeURIComponent(door.productName)}`}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-brand-blue text-white text-xs font-semibold hover:bg-brand-blue/90 active:scale-[0.97] transition-all shrink-0"
              >
                Create
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          ))}
        </div>

        {/* Hint */}
        <div className="px-5 pb-3">
          <p className="text-xs text-text-muted bg-surface-secondary rounded-xl px-3 py-2">
            Creating door sheets now ensures fabrication starts on time. You can also save as draft and create them later.
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
