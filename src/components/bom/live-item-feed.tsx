"use client"

import { useEffect, useState } from "react"
import { cn, formatQuantity } from "@/lib/utils"
import { Check, AlertCircle, Minus, Plus, Wrench } from "lucide-react"
import { SwipeableRow } from "./swipeable-row"
import { PanelDimensionEditor } from "./panel-dimension-editor"
import { UnitConversionPrompt } from "./unit-conversion-prompt"
import { FlaggedItemResolver } from "./flagged-item-resolver"
import { OptionPicker } from "@/components/doors/option-picker"

const STANDARD_UNITS = [
  { label: "ea", value: "ea" },
  { label: "lbs", value: "lbs" },
  { label: "lf", value: "lf" },
  { label: "sf", value: "sf" },
  { label: "in", value: "in" },
  { label: "ft", value: "ft" },
  { label: "box", value: "box" },
  { label: "roll", value: "roll" },
  { label: "bag", value: "bag" },
  { label: "tube", value: "tube" },
  { label: "gal", value: "gal" },
  { label: "case", value: "case" },
]

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
  isAssembly?: boolean
  nonCatalogCategory?: string
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
  onUpdateUnit?: (id: string, unit: string) => void
  onDelete: (id: string) => void
  onResolveFlagged: (id: string) => void
  onEditDimensions?: (id: string, thickness: number, lengthFt: number, lengthIn: number) => void
  onConversionConfirm?: (id: string, factor: number) => void
  // Inline resolver
  resolvingItemId?: string | null
  onResolveSelect?: (id: string, productId: string, productName: string) => void
  onResolveKeepAsCustom?: (id: string) => void
}

/** Tappable unit pill that opens OptionPicker scroll wheel */
function UnitPillPicker({ unit, onChange }: { unit: string; onChange: (unit: string) => void }) {
  const [open, setOpen] = useState(false)

  const options = (() => {
    const seen = new Set<string>()
    const opts: { label: string; value: string }[] = []
    if (unit && !seen.has(unit)) {
      opts.push({ label: unit, value: unit })
      seen.add(unit)
    }
    for (const u of STANDARD_UNITS) {
      if (!seen.has(u.value)) {
        opts.push(u)
        seen.add(u.value)
      }
    }
    return opts
  })()

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="h-10 w-[52px] text-center text-xs font-semibold text-brand-blue bg-brand-blue/10 border border-brand-blue/20 rounded-xl active:bg-brand-blue/20 transition-colors"
      >
        {unit}
      </button>
      <OptionPicker
        open={open}
        onOpenChange={setOpen}
        label="Unit of Measure"
        wheels={[{ label: "Unit", options }]}
        selectedValues={[unit]}
        onDone={([val]) => {
          if (val && val !== unit) onChange(val)
        }}
      />
    </>
  )
}

export function LiveItemFeed({
  items,
  phase,
  onUpdateQty,
  onUpdateUnit,
  onDelete,
  onResolveFlagged,
  onEditDimensions,
  onConversionConfirm,
  resolvingItemId,
  onResolveSelect,
  onResolveKeepAsCustom,
}: LiveItemFeedProps) {
  const [visibleCount, setVisibleCount] = useState(0)

  useEffect(() => {
    if (phase === "loading") {
      setVisibleCount(0)
      return
    }

    if (items.length > visibleCount) {
      const timer = setTimeout(() => {
        setVisibleCount((prev) => Math.min(prev + 1, items.length))
      }, 120)
      return () => clearTimeout(timer)
    }
  }, [items.length, visibleCount, phase])

  // ── Loading state — Vibecode-style ──
  if (phase === "loading") {
    return (
      <div className="py-16 text-center animate-phase-enter">
        <div className="inline-flex flex-col items-center gap-3">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-brand-orange animate-building-pulse" style={{ animationDelay: "0s" }} />
            <div className="h-2 w-2 rounded-full bg-brand-orange animate-building-pulse" style={{ animationDelay: "0.3s" }} />
            <div className="h-2 w-2 rounded-full bg-brand-orange animate-building-pulse" style={{ animationDelay: "0.6s" }} />
          </div>
          <p className="text-[15px] font-bold text-navy">Reading your list</p>
          <p className="text-xs text-text-muted">Matching items to catalog...</p>
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

  const needsReviewCount = items.filter((i) => !i.confirmed).length
  const flaggedCount = items.filter((i) => i.confidence < 0.70 && !i.confirmed).length
  const confirmedCount = items.filter((i) => i.confirmed).length

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2.5">
          {phase === "done" && flaggedCount === 0 && (
            <div className="circle-checkbox checked" style={{ width: 22, height: 22 }}>
              <Check className="h-3 w-3 text-white" />
            </div>
          )}
          {phase === "done" && flaggedCount > 0 && (
            <div className="circle-checkbox flagged" style={{ width: 22, height: 22 }}>
              <AlertCircle className="h-3 w-3 text-brand-orange" />
            </div>
          )}
          {(phase === "pass1" || phase === "pass2") && (
            <div className="h-2.5 w-2.5 rounded-full bg-brand-orange animate-building-pulse" />
          )}
          <p className="text-[15px] font-bold text-navy">{headerText}</p>
        </div>
        {phase === "done" && (
          <div className="flex items-center gap-3">
            {confirmedCount > 0 && (
              <span className="text-xs font-semibold text-status-green">{confirmedCount} confirmed</span>
            )}
            {needsReviewCount > 0 && (
              <span className="text-xs font-semibold text-brand-blue">{needsReviewCount} to review</span>
            )}
          </div>
        )}
      </div>

      {/* Progress bar for Pass 2 — indeterminate shimmer */}
      {phase === "pass2" && (
        <div className="mx-4 mb-3 progress-indeterminate" />
      )}

      {/* Item rows */}
      <div>
        {items.slice(0, visibleCount).map((item, index) => {
          const isFlagged = item.confidence < 0.70 && !item.confirmed
          const isLikelyMatch = !item.confirmed && item.confidence >= 0.70 && item.confidence < 0.95
          const isConfirmed = item.confirmed

          const showConversion = item.needsConversion && item.parsedUom && item.catalogUom && onConversionConfirm

          return (
            <SwipeableRow key={item.id} onDelete={() => onDelete(item.id)}>
              <div className={cn(
                "border-b",
                isFlagged ? "border-orange-200/60" : "border-border-custom/30"
              )}>
              <div
                className={cn(
                  "flex items-center gap-3 px-4 py-3.5 transition-all duration-300",
                  isFlagged ? "bg-orange-50/40" : "",
                  "animate-item-enter"
                )}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {/* Things 3 circle checkbox */}
                <div className="shrink-0">
                  {isConfirmed ? (
                    <div className="circle-checkbox checked">
                      <Check className="h-3.5 w-3.5 text-white" />
                    </div>
                  ) : isLikelyMatch ? (
                    item.isPanel ? (
                      <div className="circle-checkbox likely">
                        <Check className="h-3.5 w-3.5 text-brand-blue" />
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onResolveFlagged(item.id)}
                        className="circle-checkbox likely ios-press"
                      >
                        <Check className="h-3.5 w-3.5 text-brand-blue" />
                      </button>
                    )
                  ) : isFlagged ? (
                    item.isPanel ? (
                      <div className="circle-checkbox flagged">
                        <AlertCircle className="h-3.5 w-3.5 text-brand-orange" />
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onResolveFlagged(item.id)}
                        className="circle-checkbox flagged ios-press"
                      >
                        <AlertCircle className="h-3.5 w-3.5 text-brand-orange" />
                      </button>
                    )
                  ) : (
                    <div className="circle-checkbox" />
                  )}
                </div>

                {/* Product info */}
                <div className="flex-1 min-w-0">
                  {item.isPanel ? (
                    <p className={cn(
                      "text-[15px] font-semibold leading-snug text-left w-full break-words",
                      isFlagged ? "text-orange-700" : "text-navy"
                    )}>
                      {item.productName}
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onResolveFlagged(item.id)}
                      className={cn(
                        "text-[15px] font-semibold leading-snug text-left w-full break-words",
                        isFlagged ? "text-orange-700" : "text-navy"
                      )}
                    >
                      {item.productName}
                    </button>
                  )}
                  {item.isPanel && (
                    <p className="text-xs text-brand-blue font-medium mt-0.5">Brand selected at checkout</p>
                  )}
                  {item.isAssembly && (
                    <span className="inline-flex items-center gap-0.5 mt-0.5 px-1.5 py-0.5 rounded-xl text-[10px] font-bold bg-blue-50 text-brand-blue">
                      <Wrench className="h-2.5 w-2.5" />
                      In-house
                    </span>
                  )}
                  {item.isNonCatalog && !item.isPanel && !item.isAssembly && (
                    <span className="inline-block mt-0.5 px-1.5 py-0.5 rounded-xl text-[10px] font-bold bg-brand-orange/10 text-brand-orange">Custom</span>
                  )}
                  {isFlagged && !item.isPanel && (
                    <button
                      type="button"
                      onClick={() => onResolveFlagged(item.id)}
                      className="text-xs text-orange-500 font-semibold mt-1"
                    >
                      Tap to review
                    </button>
                  )}
                </div>

                {/* Quantity stepper + unit pill */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <div className="flex items-center gap-0">
                    <button
                      type="button"
                      onClick={() => onUpdateQty(item.id, Math.max(0, Math.round((item.quantity - 0.5) * 10) / 10))}
                      className="h-10 w-10 flex items-center justify-center rounded-l-xl border border-border-custom bg-surface-secondary text-navy active:bg-border-custom transition-colors"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => onUpdateQty(item.id, Math.max(0, Number(e.target.value) || 0))}
                      className="w-14 h-10 text-center text-sm font-bold border-y border-border-custom bg-white tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      min={0}
                      step="0.5"
                    />
                    <button
                      type="button"
                      onClick={() => onUpdateQty(item.id, Math.round((item.quantity + 0.5) * 10) / 10)}
                      className="h-10 w-10 flex items-center justify-center rounded-r-xl border border-border-custom bg-surface-secondary text-navy active:bg-border-custom transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <UnitPillPicker
                    unit={item.unitOfMeasure}
                    onChange={(unit) => onUpdateUnit?.(item.id, unit)}
                  />
                </div>
              </div>
              {/* Panel dimension editor — full width below item row */}
              {item.isPanel && item.panelSpecs && onEditDimensions && (
                <div className="px-4 pt-1 pb-3">
                  <PanelDimensionEditor
                    thickness={(item.panelSpecs as { thickness?: number }).thickness ?? 4}
                    lengthFt={Math.floor((item.panelSpecs as { cutLengthFt?: number }).cutLengthFt ?? 0)}
                    lengthIn={Math.round(((item.panelSpecs as { cutLengthFt?: number }).cutLengthFt ?? 0) % 1 * 12)}
                    onUpdate={(t, ft, inches) => onEditDimensions(item.id, t, ft, inches)}
                  />
                </div>
              )}
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
              {/* Inline resolver — expands below tapped item (never for panels) */}
              {resolvingItemId === item.id && !item.isPanel && onResolveSelect && onResolveKeepAsCustom && (
                <div className="px-4 py-3 border-b border-border-custom/40 bg-surface-secondary/50 animate-ios-expand">
                  {item.confirmed && item.isNonCatalog && !item.isPanel ? (
                    <div className="flex items-center gap-2 py-2">
                      <div className="circle-checkbox checked" style={{ width: 20, height: 20 }}>
                        <Check className="h-3 w-3 text-white" />
                      </div>
                      <p className="text-sm font-semibold text-green-700">Added as custom item</p>
                    </div>
                  ) : (
                    <FlaggedItemResolver
                      rawText={item.rawText}
                      primaryMatch={item.productId ? {
                        productId: item.productId,
                        productName: item.productName,
                        confidence: item.confidence,
                      } : null}
                      alternatives={item.alternatives || []}
                      onSelect={(productId, productName) => onResolveSelect(item.id, productId, productName)}
                      onKeepAsCustom={() => onResolveKeepAsCustom(item.id)}
                      isPanel={item.isPanel}
                    />
                  )}
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
