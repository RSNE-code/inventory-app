"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { createPortal } from "react-dom"
import { Button } from "@/components/ui/button"
import { FRACTIONS, fractionTickHeight, formatFractionalInches, splitInchesAndFraction } from "@/lib/door-specs"
import { cn } from "@/lib/utils"
import { Ruler, X } from "lucide-react"

// ─── Types ───────────────────────────────────────────────────────────────────

interface TapeMeasureInputProps {
  /** Current value like "36-3/16" or "36" */
  value: string
  /** Called with formatted fractional string */
  onChange: (value: string) => void
  /** Field label shown in the sheet header */
  label?: string
  /** Minimum inches (default 0) */
  min?: number
  /** Maximum inches (default 120) */
  max?: number
  /** Controlled open state */
  open: boolean
  /** Open state change handler */
  onOpenChange: (open: boolean) => void
}

// ─── Constants ───────────────────────────────────────────────────────────────

const ITEM_HEIGHT = 48 // px — each scroll item, above 44px touch target
const VISIBLE_ITEMS = 5 // items visible in the wheel at once
const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS // 240px

// ─── Component ───────────────────────────────────────────────────────────────

export function TapeMeasureInput({
  value,
  onChange,
  label = "Dimension",
  min = 0,
  max = 120,
  open,
  onOpenChange,
}: TapeMeasureInputProps) {
  const { inches: initInches, fractionIndex: initFrac } = splitInchesAndFraction(value)
  const [selectedInches, setSelectedInches] = useState(initInches)
  const [selectedFraction, setSelectedFraction] = useState(initFrac)

  const inchWheelRef = useRef<HTMLDivElement>(null)
  const fracWheelRef = useRef<HTMLDivElement>(null)
  const inchScrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fracScrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Reset state when opened with a new value
  useEffect(() => {
    if (open) {
      const { inches, fractionIndex } = splitInchesAndFraction(value)
      setSelectedInches(inches)
      setSelectedFraction(fractionIndex)

      // Double rAF to ensure DOM is painted before scrolling
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          scrollToIndex(inchWheelRef.current, inches - min)
          scrollToIndex(fracWheelRef.current, fractionIndex)
        })
      })
    }
  }, [open, value, min])

  // ── Scroll helpers ──

  function scrollToIndex(el: HTMLDivElement | null, index: number) {
    if (!el) return
    el.scrollTop = index * ITEM_HEIGHT
  }

  function getSelectedIndex(el: HTMLDivElement | null): number {
    if (!el) return 0
    const scrollPos = el.scrollTop
    return Math.round(scrollPos / ITEM_HEIGHT)
  }

  const handleInchScroll = useCallback(() => {
    if (inchScrollTimer.current) clearTimeout(inchScrollTimer.current)
    inchScrollTimer.current = setTimeout(() => {
      const idx = getSelectedIndex(inchWheelRef.current)
      setSelectedInches(Math.max(min, Math.min(max, idx + min)))
    }, 80)
  }, [min, max])

  const handleFracScroll = useCallback(() => {
    if (fracScrollTimer.current) clearTimeout(fracScrollTimer.current)
    fracScrollTimer.current = setTimeout(() => {
      const idx = getSelectedIndex(fracWheelRef.current)
      setSelectedFraction(Math.max(0, Math.min(FRACTIONS.length - 1, idx)))
    }, 80)
  }, [])

  // ── Actions ──

  function handleDone() {
    const decimal = selectedInches + FRACTIONS[selectedFraction].decimal
    const formatted = formatFractionalInches(decimal)
    onChange(formatted || String(selectedInches))
    onOpenChange(false)
  }

  function handleClear() {
    onChange("")
    onOpenChange(false)
  }

  // ── Current display value ──

  const displayValue = (() => {
    const frac = FRACTIONS[selectedFraction]
    if (frac.numerator === 0) return `${selectedInches}"`
    return `${selectedInches}-${frac.label}"`
  })()

  // Generate inch range
  const inchRange: number[] = []
  for (let i = min; i <= max; i++) inchRange.push(i)

  // Padding items for scroll centering (empty items above and below)
  const padCount = Math.floor(VISIBLE_ITEMS / 2)

  if (!open || typeof document === "undefined") return null

  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/40 animate-tape-overlay"
        onClick={() => onOpenChange(false)}
      />

      {/* Bottom sheet */}
      <div className="relative bg-white rounded-t-2xl shadow-brand-md animate-tape-open overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-4 pb-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-text-muted">{label}</p>
            <p className="text-2xl font-bold text-navy tabular-nums mt-0.5">{displayValue}</p>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="h-9 w-9 flex items-center justify-center rounded-xl bg-surface-secondary hover:bg-surface-secondary/80 transition-colors"
          >
            <X className="h-4 w-4 text-text-muted" />
          </button>
        </div>

        {/* Tape measure picker area */}
        <div className="tape-measure-bg tape-measure-worn-edge relative mx-3 rounded-xl overflow-hidden mb-3" style={{ height: WHEEL_HEIGHT }}>
          {/* Selection line */}
          <div className="tape-selection-line" />

          {/* Fade edges */}
          <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-[#FFC107] to-transparent z-[5] pointer-events-none rounded-t-xl" />
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#FFB300] to-transparent z-[5] pointer-events-none rounded-b-xl" />

          <div className="flex h-full">
            {/* ── Inches Wheel ── */}
            <div className="flex-1 relative">
              <div
                ref={inchWheelRef}
                className="tape-scroll-wheel h-full overflow-y-auto"
                onScroll={handleInchScroll}
              >
                {/* Top padding */}
                {Array.from({ length: padCount }).map((_, i) => (
                  <div key={`pad-t-${i}`} className="tape-scroll-item" style={{ height: ITEM_HEIGHT }} />
                ))}

                {inchRange.map((inch) => {
                  const isSelected = inch === selectedInches
                  return (
                    <div
                      key={inch}
                      className="tape-scroll-item justify-end pr-3 gap-2"
                      style={{ height: ITEM_HEIGHT }}
                    >
                      <span
                        className={cn(
                          "text-right tabular-nums transition-all duration-150 select-none",
                          isSelected
                            ? "text-lg font-bold text-[#1a1a1a]"
                            : "text-sm font-medium text-[#1a1a1a]/40"
                        )}
                      >
                        {inch}
                      </span>
                      <div className="tape-tick tape-tick-inch shrink-0" />
                    </div>
                  )
                })}

                {/* Bottom padding */}
                {Array.from({ length: padCount }).map((_, i) => (
                  <div key={`pad-b-${i}`} className="tape-scroll-item" style={{ height: ITEM_HEIGHT }} />
                ))}
              </div>
            </div>

            {/* ── Divider ── */}
            <div className="w-px bg-black/10 my-4" />

            {/* ── Fractions Wheel ── */}
            <div className="flex-1 relative">
              <div
                ref={fracWheelRef}
                className="tape-scroll-wheel h-full overflow-y-auto"
                onScroll={handleFracScroll}
              >
                {/* Top padding */}
                {Array.from({ length: padCount }).map((_, i) => (
                  <div key={`pad-t-${i}`} className="tape-scroll-item" style={{ height: ITEM_HEIGHT }} />
                ))}

                {FRACTIONS.map((frac, idx) => {
                  const isSelected = idx === selectedFraction
                  const tickType = fractionTickHeight(idx)
                  return (
                    <div
                      key={idx}
                      className="tape-scroll-item pl-3 gap-2"
                      style={{ height: ITEM_HEIGHT }}
                    >
                      <div className={`tape-tick tape-tick-${tickType} shrink-0`} />
                      <span
                        className={cn(
                          "tabular-nums transition-all duration-150 select-none",
                          isSelected
                            ? "text-base font-bold text-[#1a1a1a]"
                            : "text-sm font-medium text-[#1a1a1a]/40"
                        )}
                      >
                        {frac.label === "0" ? "0" : frac.label}
                      </span>
                    </div>
                  )
                })}

                {/* Bottom padding */}
                {Array.from({ length: padCount }).map((_, i) => (
                  <div key={`pad-b-${i}`} className="tape-scroll-item" style={{ height: ITEM_HEIGHT }} />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 pt-1 flex gap-3">
          <Button
            variant="ghost"
            onClick={handleClear}
            className="flex-shrink-0 text-text-muted"
          >
            Clear
          </Button>
          <Button
            onClick={handleDone}
            className="flex-1 h-12 bg-brand-orange hover:bg-brand-orange-hover text-white font-semibold text-base rounded-xl"
          >
            <Ruler className="h-4 w-4 mr-2" />
            Done — {displayValue}
          </Button>
        </div>

        {/* Safe area padding for iOS */}
        <div className="pb-safe" />
      </div>
    </div>,
    document.body
  )
}

// ─── Trigger Component (tappable field that opens the picker) ────────────────

interface TapeMeasureTriggerProps {
  value: string
  label?: string
  placeholder?: string
  onOpen: () => void
}

/** Tappable display field that shows the current dimension value */
export function TapeMeasureTrigger({ value, label, placeholder = "Tap to measure", onOpen }: TapeMeasureTriggerProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full flex items-center justify-between p-4 rounded-xl border-2 border-border-custom bg-white hover:border-brand-blue/50 transition-all duration-200 active:scale-[0.98] min-h-[56px]"
    >
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-brand-orange/15 flex items-center justify-center">
          <Ruler className="h-5 w-5 text-brand-orange" />
        </div>
        <div className="text-left">
          {label && <p className="text-xs text-text-muted">{label}</p>}
          {value ? (
            <p className="text-lg font-bold text-navy tabular-nums">{value}&quot;</p>
          ) : (
            <p className="text-sm text-text-muted">{placeholder}</p>
          )}
        </div>
      </div>
      <div className="text-xs text-text-muted bg-surface-secondary px-2 py-1 rounded-xl font-medium">
        TAP
      </div>
    </button>
  )
}
