"use client"

import { useState } from "react"
import { cn, formatQuantity } from "@/lib/utils"
import { Check, PackageCheck, Layers, Minus, Plus, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"

interface PickItem {
  id: string
  name: string
  qtyNeeded: number
  qtyCheckedOut: number
  qtyReturned: number
  unitOfMeasure: string
  isPanel: boolean
  isDoorPending?: boolean
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
  // Session-local pick state: lineItemId → qty to checkout
  const [picked, setPicked] = useState<Record<string, number>>({})

  function getRemaining(item: PickItem) {
    const net = item.qtyCheckedOut - item.qtyReturned
    return Math.max(0, item.qtyNeeded - net)
  }

  function isFullyCheckedOut(item: PickItem) {
    return item.qtyCheckedOut >= item.qtyNeeded && item.qtyNeeded > 0
  }

  function togglePick(item: PickItem) {
    if (item.isPanel || item.isDoorPending) return
    const remaining = getRemaining(item)

    setPicked((prev) => {
      if (prev[item.id] !== undefined) {
        const next = { ...prev }
        delete next[item.id]
        return next
      }
      // For fully checked out items, default to 1 (adding more)
      return { ...prev, [item.id]: remaining > 0 ? remaining : 1 }
    })
  }

  function updatePickQty(id: string, qty: number) {
    setPicked((prev) => ({ ...prev, [id]: Math.max(0, qty) }))
  }

  function selectAllRemaining() {
    const next: Record<string, number> = {}
    for (const item of items) {
      if (isFullyCheckedOut(item) || item.isPanel || item.isDoorPending) continue
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
    setPicked({})
  }

  const pickedCount = Object.keys(picked).length
  const totalItems = items.length
  const fulfilledCount = items.filter((i) => isFullyCheckedOut(i)).length

  return (
    <div className="space-y-2">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">
          {fulfilledCount} of {totalItems} fulfilled
        </span>
        {fulfilledCount < totalItems && (
          <button
            type="button"
            onClick={selectAllRemaining}
            className="text-xs font-semibold text-brand-blue active:text-brand-blue/70"
          >
            Select All
          </button>
        )}
      </div>

      {/* Item list — each row has pick circle + name + qty controls */}
      <div className="rounded-xl border border-border-custom overflow-hidden bg-white">
        {items.map((item) => {
          const remaining = getRemaining(item)
          const fullyDone = isFullyCheckedOut(item)
          const isPicked = picked[item.id] !== undefined
          const progress = item.qtyNeeded > 0 ? Math.min(1, item.qtyCheckedOut / item.qtyNeeded) : 0

          return (
            <div
              key={item.id}
              className={cn(
                "flex items-center gap-3 px-3 py-3 border-b border-border-custom/30 last:border-b-0 transition-colors",
                isPicked && "bg-brand-blue/5",
              )}
            >
              {/* Pick circle */}
              <button
                type="button"
                onClick={() => togglePick(item)}
                disabled={item.isPanel || item.isDoorPending}
                className="shrink-0 ios-press"
              >
                {fullyDone && !isPicked ? (
                  <div className="h-8 w-8 rounded-full bg-status-green flex items-center justify-center">
                    <Check className="h-4 w-4 text-white" />
                  </div>
                ) : fullyDone && isPicked ? (
                  <div className="h-8 w-8 rounded-full bg-brand-orange flex items-center justify-center">
                    <Plus className="h-4 w-4 text-white" />
                  </div>
                ) : item.isDoorPending ? (
                  <div className="h-8 w-8 rounded-full bg-status-yellow/20 flex items-center justify-center">
                    <Clock className="h-4 w-4 text-status-yellow" />
                  </div>
                ) : isPicked ? (
                  <div className="h-8 w-8 rounded-full bg-brand-blue flex items-center justify-center">
                    <Check className="h-4 w-4 text-white" />
                  </div>
                ) : progress > 0 && !item.isPanel ? (
                  <div className="relative h-8 w-8">
                    <svg className="h-8 w-8 -rotate-90" viewBox="0 0 32 32">
                      <circle cx="16" cy="16" r="14" fill="none" stroke="currentColor" strokeWidth="2" className="text-border-custom" />
                      <circle cx="16" cy="16" r="14" fill="none" stroke="currentColor" strokeWidth="2.5"
                        className="text-status-green"
                        strokeDasharray={`${progress * 87.96} 87.96`}
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                ) : item.isPanel ? (
                  progress > 0 ? (
                    <div className="relative h-8 w-8">
                      <svg className="h-8 w-8 -rotate-90" viewBox="0 0 32 32">
                        <circle cx="16" cy="16" r="14" fill="none" stroke="currentColor" strokeWidth="2" className="text-border-custom" />
                        <circle cx="16" cy="16" r="14" fill="none" stroke="currentColor" strokeWidth="2.5"
                          className="text-status-green"
                          strokeDasharray={`${progress * 87.96} 87.96`}
                          strokeLinecap="round"
                        />
                      </svg>
                    </div>
                  ) : (
                    <div className="h-8 w-8 rounded-full border-2 border-border-custom" />
                  )
                ) : (
                  <div className="h-8 w-8 rounded-full border-2 border-border-custom" />
                )}
              </button>

              {/* Item name + status */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  {item.isPanel && <Layers className="h-3.5 w-3.5 text-brand-blue shrink-0" />}
                  <p className={cn(
                    "text-[15px] font-semibold leading-snug truncate",
                    fullyDone ? "text-text-muted line-through" : "text-navy"
                  )}>
                    {item.name}
                  </p>
                </div>
                <p className="text-xs text-text-muted mt-0.5">
                  {item.isDoorPending
                    ? "In Door Shop — complete before checkout"
                    : fullyDone && !isPicked
                    ? <>{formatQuantity(item.qtyCheckedOut)} {item.unitOfMeasure} done · <span className="text-brand-blue font-semibold cursor-pointer" onClick={(e) => { e.stopPropagation(); togglePick(item) }}>Need more?</span></>
                    : fullyDone && isPicked
                    ? `Adding more (${formatQuantity(item.qtyCheckedOut)} already pulled)`
                    : item.qtyCheckedOut > 0
                      ? `${formatQuantity(item.qtyCheckedOut)}/${formatQuantity(item.qtyNeeded)} ${item.unitOfMeasure} pulled`
                      : `${formatQuantity(item.qtyNeeded)} ${item.unitOfMeasure}`}
                </p>
              </div>

              {/* Qty stepper — shows when picked */}
              {isPicked && (
                <div className="flex items-center gap-0 shrink-0">
                  <button
                    type="button"
                    onClick={() => updatePickQty(item.id, (picked[item.id] || 0) - 1)}
                    className="h-10 w-10 flex items-center justify-center rounded-l-xl border border-border-custom bg-surface-secondary text-navy active:bg-border-custom transition-colors"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <input
                    type="number"
                    value={picked[item.id] || 0}
                    onChange={(e) => updatePickQty(item.id, Math.max(0, Number(e.target.value) || 0))}
                    className="w-12 h-10 text-center text-sm font-bold border-y border-border-custom bg-white tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                    min={0}
                  />
                  <button
                    type="button"
                    onClick={() => updatePickQty(item.id, (picked[item.id] || 0) + 1)}
                    className="h-10 w-10 flex items-center justify-center rounded-r-xl border border-border-custom bg-surface-secondary text-navy active:bg-border-custom transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              )}

              {/* Panel checkout button — instead of qty stepper */}
              {item.isPanel && !fullyDone && remaining > 0 && onPanelCheckout && !isPicked && (
                <button
                  type="button"
                  onClick={() => onPanelCheckout(item.id)}
                  className="shrink-0 h-10 px-3 flex items-center gap-1.5 rounded-xl bg-brand-blue/10 text-brand-blue text-xs font-semibold active:bg-brand-blue/20 ios-press transition-all"
                >
                  <PackageCheck className="h-3.5 w-3.5" />
                  Checkout
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Checkout button */}
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
