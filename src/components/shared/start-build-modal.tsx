"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Play, Loader2 } from "lucide-react"
import { cn, formatQuantity } from "@/lib/utils"

interface StartBuildModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
  assemblyName: string
  components: Array<{
    id: string
    product: { name: string; unitOfMeasure: string; currentQty: number }
    qtyUsed: number | string
  }>
  isPending?: boolean
}

export function StartBuildModal({
  open,
  onOpenChange,
  onConfirm,
  assemblyName,
  components,
  isPending = false,
}: StartBuildModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          "rounded-2xl p-0 gap-0 overflow-hidden",
          "backdrop-blur-xl",
          "data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-bottom-4",
          "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-bottom-4"
        )}
      >
        {/* Navy header strip */}
        <DialogHeader className="bg-navy px-5 py-4 gap-0">
          <DialogTitle className="flex items-center gap-2.5 text-white text-base font-semibold">
            <AlertTriangle className="size-5 text-brand-orange shrink-0" />
            <span className="truncate">Start Build — {assemblyName}</span>
          </DialogTitle>
        </DialogHeader>

        {/* Body */}
        <div className="px-5 py-4 space-y-3">
          <p className="text-sm text-text-secondary">
            This will deduct the following materials from inventory:
          </p>

          {/* Component list */}
          <div className="max-h-[240px] overflow-y-auto -mx-1 px-1 space-y-2">
            {components.map((comp) => {
              const qtyUsed = typeof comp.qtyUsed === "string" ? Number(comp.qtyUsed) : comp.qtyUsed
              const hasEnough = comp.product.currentQty >= qtyUsed

              return (
                <div
                  key={comp.id}
                  className="flex items-center justify-between gap-3 rounded-xl bg-surface-secondary px-3.5 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-text-primary truncate">
                      {comp.product.name}
                    </p>
                    <p className="text-xs text-text-muted mt-0.5">
                      Deduct {formatQuantity(qtyUsed, comp.product.unitOfMeasure)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p
                      className={cn(
                        "text-sm font-semibold tabular-nums",
                        hasEnough ? "text-status-green" : "text-status-red"
                      )}
                    >
                      {formatQuantity(comp.product.currentQty)}
                    </p>
                    <p className="text-[11px] text-text-muted">in stock</p>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Warning */}
          <p className="text-xs text-text-muted font-medium pt-1">
            This action cannot be undone.
          </p>
        </div>

        {/* Footer */}
        <DialogFooter className="px-5 py-4 border-t border-border-custom sm:justify-between">
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isPending}
            className="text-text-muted min-h-[44px] h-11 rounded-xl"
          >
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={isPending}
            className="bg-brand-orange hover:bg-brand-orange-hover text-white font-semibold rounded-xl h-12 min-h-[44px] px-6"
          >
            {isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Building...
              </>
            ) : (
              <>
                <Play className="size-4" />
                Start Build
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
