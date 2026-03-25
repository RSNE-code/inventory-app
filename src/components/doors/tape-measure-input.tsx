"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { createPortal } from "react-dom"
import { Button } from "@/components/ui/button"
import { FRACTIONS, fractionTickHeight, formatFractionalInches, splitInchesAndFraction } from "@/lib/door-specs"
import { cn } from "@/lib/utils"
import { Ruler, X } from "lucide-react"

// ─── Types ───────────────────────────────────────────────────────────────────

type PickerMode = "inches-fractions" | "feet-inches"

interface TapeMeasureInputProps {
  /** Current value — always total inches as string (e.g. "144" for 12') */
  value: string
  /** Called with total inches as string */
  onChange: (value: string) => void
  /** Field label shown in the sheet header */
  label?: string
  /**
   * Mode determines wheel content:
   * - "inches-fractions" (default): Left=inches, Right=fractions (doors, ramps)
   * - "feet-inches": Left=feet, Right=0-11 inches (wall/floor panels)
   */
  mode?: PickerMode
  /** Minimum value — inches for "inches-fractions", feet for "feet-inches" */
  min?: number
  /** Maximum value — inches for "inches-fractions", feet for "feet-inches" */
  max?: number
  /** Controlled open state */
  open: boolean
  /** Open state change handler */
  onOpenChange: (open: boolean) => void
}

// ─── Constants ───────────────────────────────────────────────────────────────

const ITEM_HEIGHT = 48
const VISIBLE_ITEMS = 5
const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS

// ─── Component ───────────────────────────────────────────────────────────────

export function TapeMeasureInput({
  value,
  onChange,
  label = "Dimension",
  mode = "inches-fractions",
  min = 0,
  max = 120,
  open,
  onOpenChange,
}: TapeMeasureInputProps) {
  // ── Parse initial value based on mode ──
  const parseValue = useCallback((val: string) => {
    if (mode === "feet-inches") {
      const totalInches = parseInt(val) || 0
      return { left: Math.floor(totalInches / 12), right: totalInches % 12 }
    }
    const { inches, fractionIndex } = splitInchesAndFraction(val)
    return { left: inches, right: fractionIndex }
  }, [mode])

  const init = parseValue(value)
  const [selectedLeft, setSelectedLeft] = useState(init.left)
  const [selectedRight, setSelectedRight] = useState(init.right)

  const leftWheelRef = useRef<HTMLDivElement>(null)
  const rightWheelRef = useRef<HTMLDivElement>(null)
  const leftScrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const rightScrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Range generation ──
  const leftMin = min
  const leftMax = max
  const rightMin = 0
  const rightMax = mode === "feet-inches" ? 11 : FRACTIONS.length - 1

  const leftRange: number[] = []
  for (let i = leftMin; i <= leftMax; i++) leftRange.push(i)

  const rightRange: number[] = mode === "feet-inches"
    ? Array.from({ length: 12 }, (_, i) => i) // 0-11 inches
    : [] // fractions handled separately

  // Reset state when opened
  useEffect(() => {
    if (open) {
      const parsed = parseValue(value)
      setSelectedLeft(parsed.left)
      setSelectedRight(parsed.right)

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          scrollToIndex(leftWheelRef.current, parsed.left - leftMin)
          scrollToIndex(rightWheelRef.current, parsed.right - rightMin)
        })
      })
    }
  }, [open, value, leftMin, rightMin, parseValue])

  // ── Scroll helpers ──

  function scrollToIndex(el: HTMLDivElement | null, index: number) {
    if (!el) return
    el.scrollTop = index * ITEM_HEIGHT
  }

  function getSelectedIndex(el: HTMLDivElement | null): number {
    if (!el) return 0
    return Math.round(el.scrollTop / ITEM_HEIGHT)
  }

  const handleLeftScroll = useCallback(() => {
    if (leftScrollTimer.current) clearTimeout(leftScrollTimer.current)
    leftScrollTimer.current = setTimeout(() => {
      const idx = getSelectedIndex(leftWheelRef.current)
      const clamped = Math.max(leftMin, Math.min(leftMax, idx + leftMin))
      setSelectedLeft(clamped)
      const clampedIdx = clamped - leftMin
      if (idx !== clampedIdx) {
        scrollToIndex(leftWheelRef.current, clampedIdx)
      }
    }, 80)
  }, [leftMin, leftMax])

  const handleRightScroll = useCallback(() => {
    if (rightScrollTimer.current) clearTimeout(rightScrollTimer.current)
    rightScrollTimer.current = setTimeout(() => {
      const idx = getSelectedIndex(rightWheelRef.current)
      const clamped = Math.max(rightMin, Math.min(rightMax, idx))
      setSelectedRight(clamped)
      if (idx !== clamped) {
        scrollToIndex(rightWheelRef.current, clamped)
      }
    }, 80)
  }, [rightMin, rightMax])

  // ── Actions ──

  function handleDone() {
    if (mode === "feet-inches") {
      const totalInches = selectedLeft * 12 + selectedRight
      onChange(String(totalInches))
    } else {
      const decimal = selectedLeft + FRACTIONS[selectedRight].decimal
      const formatted = formatFractionalInches(decimal)
      onChange(formatted || String(selectedLeft))
    }
    onOpenChange(false)
  }

  function handleClear() {
    onChange("")
    onOpenChange(false)
  }

  // ── Display value ──

  const displayValue = (() => {
    if (mode === "feet-inches") {
      if (selectedLeft === 0 && selectedRight === 0) return "0"
      if (selectedRight === 0) return `${selectedLeft}'`
      if (selectedLeft === 0) return `${selectedRight}"`
      return `${selectedLeft}' ${selectedRight}"`
    }
    const frac = FRACTIONS[selectedRight]
    if (frac.numerator === 0) return `${selectedLeft}"`
    return `${selectedLeft}-${frac.label}"`
  })()

  // Padding items for scroll centering
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
            {/* ── Left Wheel (Inches or Feet) ── */}
            <div className="flex-1 relative">
              <div
                ref={leftWheelRef}
                className="tape-scroll-wheel h-full overflow-y-auto"
                onScroll={handleLeftScroll}
              >
                {Array.from({ length: padCount }).map((_, i) => (
                  <div key={`pad-t-${i}`} className="tape-scroll-item" style={{ height: ITEM_HEIGHT }} />
                ))}

                {leftRange.map((val) => {
                  const isSelected = val === selectedLeft
                  return (
                    <div
                      key={val}
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
                        {val}{mode === "feet-inches" ? "'" : ""}
                      </span>
                      <div className="tape-tick tape-tick-inch shrink-0" />
                    </div>
                  )
                })}

                {Array.from({ length: padCount }).map((_, i) => (
                  <div key={`pad-b-${i}`} className="tape-scroll-item" style={{ height: ITEM_HEIGHT }} />
                ))}
              </div>
            </div>

            {/* ── Divider ── */}
            <div className="w-px bg-black/10 my-4" />

            {/* ── Right Wheel (Fractions or Inches) ── */}
            <div className="flex-1 relative">
              <div
                ref={rightWheelRef}
                className="tape-scroll-wheel h-full overflow-y-auto"
                onScroll={handleRightScroll}
              >
                {Array.from({ length: padCount }).map((_, i) => (
                  <div key={`pad-t-${i}`} className="tape-scroll-item" style={{ height: ITEM_HEIGHT }} />
                ))}

                {mode === "feet-inches" ? (
                  /* Inches 0-11 */
                  rightRange.map((val) => {
                    const isSelected = val === selectedRight
                    return (
                      <div
                        key={val}
                        className="tape-scroll-item pl-3 gap-2"
                        style={{ height: ITEM_HEIGHT }}
                      >
                        <div className="tape-tick tape-tick-inch shrink-0" />
                        <span
                          className={cn(
                            "tabular-nums transition-all duration-150 select-none",
                            isSelected
                              ? "text-base font-bold text-[#1a1a1a]"
                              : "text-sm font-medium text-[#1a1a1a]/40"
                          )}
                        >
                          {val}&quot;
                        </span>
                      </div>
                    )
                  })
                ) : (
                  /* Fractions */
                  FRACTIONS.map((frac, idx) => {
                    const isSelected = idx === selectedRight
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
                  })
                )}

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
