"use client"

import { useEffect, useState } from "react"
import { cn, formatQuantity } from "@/lib/utils"
import { Check, AlertCircle, Minus, Plus, X } from "lucide-react"
import { SwipeableRow } from "./swipeable-row"
import { PanelDimensionEditor } from "./panel-dimension-editor"
import { UnitConversionPrompt } from "./unit-conversion-prompt"

export interface FeedItem {
  id: string
  rawText: string
  productName: string
  productId: string | null
  quantity: number
  unitOfMeasure: string
  confidence: number
  isPanel: boolean
  confirmed: boolean // Pass 2 confirmed
  isNonCatalog: boolean
  panelSpecs?: Record<string, unknown>
  alternatives?: Array<{ productId: string; productName: string; confidence: number }>
  // Unit conversion fields
  needsConversion?: boolean
  parsedUom?: string
  parsedQty?: number
  conversionFactor?: number
  catalogUom?: string
}

interface LiveItemFeedProps {
  items: FeedItem[]
  phase: "loading" | "pass1" | "pass2" | "done"
  onUpdateQty: (id: string, qty: number) => void
  onDelete: (id: string) => void
  onResolveFlagged: (id: string) => void
  onEditDimensions?: (id: string, thickness: number, lengthFt: number, lengthIn: number) => void
  onConversionConfirm?: (id: string, factor: number) => void
}

export function LiveItemFeed({
  items,
  phase,
  onUpdateQty,
  onDelete,
  onResolveFlagged,
  onEditDimensions,
  onConversionConfirm,
}: LiveItemFeedProps) {
  // Items now arrive one at a time from the stream — show them immediately
  // with a short stagger delay for the receipt-printer feel
  const [visibleCount, setVisibleCount] = useState(0)

  useEffect(() => {
    if (phase === "loading") {
      setVisibleCount(0)
      return
    }

    // When new items arrive from stream, reveal them with a brief delay
    if (items.length > visibleCount) {
      const timer = setTimeout(() => {
        setVisibleCount((prev) => Math.min(prev + 1, items.length))
      }, 120) // Fast reveal — items already arrive with natural stream delay
      return () => clearTimeout(timer)
    }
  }, [items.length, visibleCount, phase])

  if (phase === "loading") {
    return (
      <div className="py-12 text-center">
        <div className="inline-flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-brand-orange animate-pulse" />
          <p className="text-[15px] font-semibold text-navy">Reading your list...</p>
        </div>
      </div>
    )
  }

  const headerText =
    phase === "pass1"
      ? `Found ${items.length} item${items.length !== 1 ? "s" : ""}...`
      : phase === "pass2"
        ? "Verifying matches..."
        : `${items.length} item${items.length !== 1 ? "s" : ""} matched`

  const flaggedCount = items.filter((i) => i.confidence < 0.70 && !i.confirmed).length

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          {phase === "done" && flaggedCount === 0 && (
            <Check className="h-5 w-5 text-green-600" />
          )}
          {phase === "done" && flaggedCount > 0 && (
            <AlertCircle className="h-5 w-5 text-orange-500" />
          )}
          {(phase === "pass1" || phase === "pass2") && (
            <div className="h-2 w-2 rounded-full bg-brand-orange animate-pulse" />
          )}
          <p className="text-[15px] font-semibold text-navy">{headerText}</p>
        </div>
        {phase === "done" && flaggedCount > 0 && (
          <span className="text-xs font-semibold text-orange-500">
            {flaggedCount} need{flaggedCount === 1 ? "s" : ""} review
          </span>
        )}
      </div>

      {/* Progress bar for Pass 2 */}
      {phase === "pass2" && (
        <div className="mx-4 mb-2 h-1 rounded-full bg-border-custom overflow-hidden">
          <div className="h-full bg-brand-orange rounded-full animate-[progress_8s_ease-in-out_forwards]" />
        </div>
      )}

      {/* Item rows */}
      <div>
        {items.slice(0, visibleCount).map((item, index) => {
          const isFlagged = item.confidence < 0.70 && !item.confirmed
          const isConfirmed = item.confirmed || item.confidence >= 0.70

          const showConversion = item.needsConversion && item.parsedUom && item.catalogUom && onConversionConfirm

          return (
            <SwipeableRow key={item.id} onDelete={() => onDelete(item.id)}>
              <div>
              <div
                className={cn(
                  "flex items-center gap-3 px-4 py-3 transition-all duration-300",
                  isFlagged ? "bg-orange-50/50" : "",
                  !showConversion ? "border-b" : "",
                  isFlagged ? "border-orange-200" : "border-border-custom/40",
                  // Entry animation
                  "animate-[slideInUp_200ms_ease-out]"
                )}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Status indicator */}
                <div className="shrink-0">
                  {isConfirmed ? (
                    <div className={cn(
                      "h-6 w-6 rounded-full flex items-center justify-center transition-all duration-500",
                      item.confirmed ? "bg-green-100" : "bg-green-50"
                    )}>
                      <Check className={cn(
                        "h-3.5 w-3.5 transition-colors duration-500",
                        item.confirmed ? "text-green-600" : "text-green-400"
                      )} />
                    </div>
                  ) : isFlagged ? (
                    <button
                      type="button"
                      onClick={() => onResolveFlagged(item.id)}
                      className="h-6 w-6 rounded-full bg-orange-100 flex items-center justify-center"
                    >
                      <AlertCircle className="h-3.5 w-3.5 text-orange-500" />
                    </button>
                  ) : (
                    <div className="h-6 w-6 rounded-full border-2 border-dashed border-border-custom" />
                  )}
                </div>

                {/* Product info */}
                <div className="flex-1 min-w-0">
                  <button
                    type="button"
                    onClick={() => onResolveFlagged(item.id)}
                    className={cn(
                      "text-[15px] font-semibold leading-snug truncate text-left w-full",
                      isFlagged ? "text-orange-700" : "text-navy underline-offset-2 decoration-border-custom hover:underline"
                    )}
                  >
                    {item.productName}
                  </button>
                  {item.isPanel && (
                    <p className="text-xs text-brand-blue font-medium mt-0.5">Brand selected at checkout</p>
                  )}
                  {/* Panel dimension editor */}
                  {item.isPanel && item.panelSpecs && onEditDimensions && (
                    <div className="mt-1.5">
                      <PanelDimensionEditor
                        thickness={(item.panelSpecs as { thickness?: number }).thickness ?? 4}
                        lengthFt={Math.floor((item.panelSpecs as { cutLengthFt?: number }).cutLengthFt ?? 0)}
                        lengthIn={Math.round(((item.panelSpecs as { cutLengthFt?: number }).cutLengthFt ?? 0) % 1 * 12)}
                        onUpdate={(t, ft, inches) => onEditDimensions(item.id, t, ft, inches)}
                      />
                    </div>
                  )}
                  {isFlagged && (
                    <button
                      type="button"
                      onClick={() => onResolveFlagged(item.id)}
                      className="text-xs text-orange-500 font-semibold mt-0.5"
                    >
                      Tap to review
                    </button>
                  )}
                </div>

                {/* Quantity stepper */}
                <div className="flex items-center gap-0 shrink-0">
                  <button
                    type="button"
                    onClick={() => onUpdateQty(item.id, Math.max(0, item.quantity - 1))}
                    className="h-10 w-10 flex items-center justify-center rounded-l-lg border border-border-custom bg-surface-secondary text-navy active:bg-border-custom"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => onUpdateQty(item.id, Number(e.target.value) || 0)}
                    className="w-12 h-10 text-center text-sm font-bold border-y border-border-custom bg-white"
                    min={0}
                    step="any"
                  />
                  <button
                    type="button"
                    onClick={() => onUpdateQty(item.id, item.quantity + 1)}
                    className="h-10 w-10 flex items-center justify-center rounded-r-lg border border-border-custom bg-surface-secondary text-navy active:bg-border-custom"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>

                {/* Delete button */}
                <button
                  type="button"
                  onClick={() => onDelete(item.id)}
                  className="h-10 w-10 flex items-center justify-center text-red-400 hover:text-red-600 shrink-0"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              {/* Unit conversion prompt — full width below item */}
              {showConversion && (
                <div className="px-4 pb-3 border-b border-border-custom/40">
                  <UnitConversionPrompt
                    parsedQty={item.parsedQty ?? item.quantity}
                    parsedUnit={item.parsedUom!}
                    catalogUnit={item.catalogUom!}
                    knownFactor={item.conversionFactor}
                    onConfirm={(factor) => onConversionConfirm!(item.id, factor)}
                  />
                </div>
              )}
              </div>
            </SwipeableRow>
          )
        })}
      </div>
    </div>
  )
}
