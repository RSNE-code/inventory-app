"use client"

import { useState } from "react"
import { cn, formatQuantity } from "@/lib/utils"
import { Check, PackageCheck, Layers } from "lucide-react"
import { Button } from "@/components/ui/button"

interface PickItem {
  id: string
  name: string
  qtyNeeded: number
  qtyCheckedOut: number
  qtyReturned: number
  unitOfMeasure: string
  isPanel: boolean
}

interface PickCheckoutSectionProps {
  items: PickItem[]
  onCheckout: (items: Array<{ bomLineItemId: string; type: "CHECKOUT"; quantity: number }>) => void
  isPending: boolean
  onPanelCheckout?: (lineItemId: string) => void
}

export function PickCheckoutSection({
  items,
  onCheckout,
  isPending,
  onPanelCheckout,
}: PickCheckoutSectionProps) {
  // Session-local pick state: which items are marked for checkout this trip
  const [picked, setPicked] = useState<Record<string, number>>({})

  const nonPanelItems = items.filter((i) => !i.isPanel)
  const panelItems = items.filter((i) => i.isPanel)

  function getRemaining(item: PickItem) {
    const net = item.qtyCheckedOut - item.qtyReturned
    return Math.max(0, item.qtyNeeded - net)
  }

  function isFullyCheckedOut(item: PickItem) {
    return item.qtyCheckedOut >= item.qtyNeeded && item.qtyNeeded > 0
  }

  function togglePick(item: PickItem) {
    if (isFullyCheckedOut(item)) return
    const remaining = getRemaining(item)
    if (remaining <= 0) return

    setPicked((prev) => {
      if (prev[item.id] !== undefined) {
        const next = { ...prev }
        delete next[item.id]
        return next
      }
      return { ...prev, [item.id]: remaining }
    })
  }

  function selectAllRemaining() {
    const next: Record<string, number> = {}
    for (const item of nonPanelItems) {
      if (isFullyCheckedOut(item)) continue
      const remaining = getRemaining(item)
      if (remaining > 0) next[item.id] = remaining
    }
    setPicked(next)
  }

  function handleCheckoutPicked() {
    const checkoutItems = Object.entries(picked)
      .filter(([, qty]) => qty > 0)
      .map(([id, qty]) => ({
        bomLineItemId: id,
        type: "CHECKOUT" as const,
        quantity: qty,
      }))
    if (checkoutItems.length === 0) return
    onCheckout(checkoutItems)
    // Clear picks after checkout (they'll show as green on re-render)
    setPicked({})
  }

  const pickedCount = Object.keys(picked).length
  const totalItems = nonPanelItems.length
  const fulfilledCount = nonPanelItems.filter((i) => isFullyCheckedOut(i)).length
  const panelsFulfilled = panelItems.filter((i) => isFullyCheckedOut(i)).length

  return (
    <div className="space-y-3">
      {/* Progress summary */}
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">
          {fulfilledCount + panelsFulfilled} of {totalItems + panelItems.length} items fulfilled
        </span>
        {fulfilledCount < totalItems && (
          <button
            type="button"
            onClick={selectAllRemaining}
            className="text-xs font-semibold text-brand-blue active:text-brand-blue/70"
          >
            Select All Remaining
          </button>
        )}
      </div>

      {/* Non-panel items with pick circles */}
      <div className="space-y-0">
        {nonPanelItems.map((item) => {
          const remaining = getRemaining(item)
          const fullyDone = isFullyCheckedOut(item)
          const isPicked = picked[item.id] !== undefined
          const progress = item.qtyNeeded > 0 ? Math.min(1, (item.qtyCheckedOut / item.qtyNeeded)) : 0

          return (
            <div
              key={item.id}
              className={cn(
                "flex items-center gap-3 px-4 py-3 border-b border-border-custom/30 transition-all",
                isPicked && "bg-brand-blue/5",
                fullyDone && "opacity-60",
              )}
            >
              {/* Pick circle */}
              <button
                type="button"
                onClick={() => togglePick(item)}
                disabled={fullyDone || remaining <= 0}
                className="shrink-0 ios-press"
              >
                {fullyDone ? (
                  <div className="h-7 w-7 rounded-full bg-status-green flex items-center justify-center">
                    <Check className="h-4 w-4 text-white" />
                  </div>
                ) : isPicked ? (
                  <div className="h-7 w-7 rounded-full bg-brand-blue flex items-center justify-center">
                    <Check className="h-4 w-4 text-white" />
                  </div>
                ) : progress > 0 ? (
                  <div className="relative h-7 w-7">
                    <svg className="h-7 w-7 -rotate-90" viewBox="0 0 28 28">
                      <circle cx="14" cy="14" r="12" fill="none" stroke="currentColor" strokeWidth="2" className="text-border-custom" />
                      <circle cx="14" cy="14" r="12" fill="none" stroke="currentColor" strokeWidth="2.5"
                        className="text-status-green"
                        strokeDasharray={`${progress * 75.4} 75.4`}
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                ) : (
                  <div className="h-7 w-7 rounded-full border-2 border-border-custom" />
                )}
              </button>

              {/* Item info */}
              <div className="flex-1 min-w-0">
                <p className={cn(
                  "text-[15px] font-semibold leading-snug truncate",
                  fullyDone ? "text-text-muted line-through" : "text-navy"
                )}>
                  {item.name}
                </p>
                <p className="text-xs text-text-muted mt-0.5">
                  {fullyDone
                    ? `${formatQuantity(item.qtyCheckedOut)} ${item.unitOfMeasure} checked out`
                    : item.qtyCheckedOut > 0
                      ? `${formatQuantity(item.qtyCheckedOut)} of ${formatQuantity(item.qtyNeeded)} ${item.unitOfMeasure} pulled`
                      : `${formatQuantity(item.qtyNeeded)} ${item.unitOfMeasure} needed`}
                </p>
              </div>

              {/* Pick qty badge */}
              {isPicked && (
                <span className="shrink-0 px-2 py-1 rounded-xl text-xs font-bold bg-brand-blue/10 text-brand-blue tabular-nums">
                  {formatQuantity(picked[item.id])} {item.unitOfMeasure}
                </span>
              )}
            </div>
          )
        })}
      </div>

      {/* Panel items — auto-state circles */}
      {panelItems.length > 0 && (
        <div className="space-y-0">
          {panelItems.map((item) => {
            const fullyDone = isFullyCheckedOut(item)
            const progress = item.qtyNeeded > 0 ? Math.min(1, (item.qtyCheckedOut / item.qtyNeeded)) : 0
            const remaining = getRemaining(item)

            return (
              <div
                key={item.id}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 border-b border-border-custom/30 transition-all",
                  fullyDone && "opacity-60",
                )}
              >
                {/* Auto-state circle — not tappable */}
                <div className="shrink-0">
                  {fullyDone ? (
                    <div className="h-7 w-7 rounded-full bg-status-green flex items-center justify-center">
                      <Check className="h-4 w-4 text-white" />
                    </div>
                  ) : progress > 0 ? (
                    <div className="relative h-7 w-7">
                      <svg className="h-7 w-7 -rotate-90" viewBox="0 0 28 28">
                        <circle cx="14" cy="14" r="12" fill="none" stroke="currentColor" strokeWidth="2" className="text-border-custom" />
                        <circle cx="14" cy="14" r="12" fill="none" stroke="currentColor" strokeWidth="2.5"
                          className="text-status-green"
                          strokeDasharray={`${progress * 75.4} 75.4`}
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>
                  ) : (
                    <div className="h-7 w-7 rounded-full border-2 border-border-custom" />
                  )}
                </div>

                {/* Panel info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <Layers className="h-3.5 w-3.5 text-brand-blue shrink-0" />
                    <p className={cn(
                      "text-[15px] font-semibold leading-snug truncate",
                      fullyDone ? "text-text-muted line-through" : "text-navy"
                    )}>
                      {item.name}
                    </p>
                  </div>
                  <p className="text-xs text-text-muted mt-0.5">
                    {fullyDone
                      ? "Panel checkout complete"
                      : item.qtyCheckedOut > 0
                        ? `${formatQuantity(item.qtyCheckedOut)} of ${formatQuantity(item.qtyNeeded)} panels checked out`
                        : `${formatQuantity(remaining)} panels — use panel checkout`}
                  </p>
                </div>

                {/* Panel checkout button */}
                {!fullyDone && remaining > 0 && onPanelCheckout && (
                  <button
                    type="button"
                    onClick={() => onPanelCheckout(item.id)}
                    className="shrink-0 h-10 px-3 flex items-center gap-1.5 rounded-xl bg-brand-blue/10 text-brand-blue text-xs font-semibold active:bg-brand-blue/20 ios-press transition-all"
                  >
                    <PackageCheck className="h-3.5 w-3.5" />
                    Check Out
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Checkout picked button */}
      {pickedCount > 0 && (
        <Button
          onClick={handleCheckoutPicked}
          disabled={isPending}
          className="w-full h-14 bg-brand-orange hover:bg-brand-orange-hover text-white font-bold text-base rounded-xl"
        >
          <PackageCheck className="h-5 w-5 mr-2" />
          {isPending ? "Processing..." : `Check Out ${pickedCount} Item${pickedCount !== 1 ? "s" : ""}`}
        </Button>
      )}
    </div>
  )
}
