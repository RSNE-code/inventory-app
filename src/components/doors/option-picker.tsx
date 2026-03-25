"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { createPortal } from "react-dom"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { Check, X } from "lucide-react"

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PickerWheel {
  label: string
  options: { label: string; value: string }[]
}

interface OptionPickerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Header label */
  label: string
  /** Wheel configurations */
  wheels: PickerWheel[]
  /** Currently selected values (one per wheel) */
  selectedValues: string[]
  /** Called with array of selected values (one per wheel) when Done is tapped */
  onDone: (values: string[]) => void
  /** If true, first wheel's last option "Other" reveals a text input */
  allowOther?: boolean
  /** Callback when second wheel options should change based on first wheel selection */
  getFilteredOptions?: (wheelIndex: number, selectedValues: string[]) => { label: string; value: string }[]
}

// ─── Constants ───────────────────────────────────────────────────────────────

const ITEM_HEIGHT = 48
const VISIBLE_ITEMS = 5
const WHEEL_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS

// ─── Component ───────────────────────────────────────────────────────────────

export function OptionPicker({
  open,
  onOpenChange,
  label,
  wheels,
  selectedValues,
  onDone,
  allowOther,
  getFilteredOptions,
}: OptionPickerProps) {
  const [selections, setSelections] = useState<string[]>(selectedValues)
  const [otherText, setOtherText] = useState("")
  const wheelRefs = useRef<(HTMLDivElement | null)[]>([])
  const scrollTimers = useRef<(ReturnType<typeof setTimeout> | null)[]>([])

  // Reset on open
  useEffect(() => {
    if (open) {
      setSelections([...selectedValues])
      setOtherText("")

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          wheels.forEach((wheel, wi) => {
            const idx = wheel.options.findIndex((o) => o.value === selectedValues[wi])
            if (idx >= 0 && wheelRefs.current[wi]) {
              wheelRefs.current[wi]!.scrollTop = idx * ITEM_HEIGHT
            }
          })
        })
      })
    }
  }, [open, selectedValues, wheels])

  // ── Scroll handling ──

  const handleScroll = useCallback((wheelIndex: number) => {
    if (scrollTimers.current[wheelIndex]) clearTimeout(scrollTimers.current[wheelIndex]!)
    scrollTimers.current[wheelIndex] = setTimeout(() => {
      const el = wheelRefs.current[wheelIndex]
      if (!el) return
      const idx = Math.round(el.scrollTop / ITEM_HEIGHT)
      const currentWheel = getEffectiveOptions(wheelIndex)
      const value = currentWheel[Math.min(idx, currentWheel.length - 1)]?.value || ""

      setSelections((prev) => {
        const next = [...prev]
        next[wheelIndex] = value
        return next
      })
    }, 80)
  }, [wheels, getFilteredOptions])

  function getEffectiveOptions(wheelIndex: number): { label: string; value: string }[] {
    if (getFilteredOptions) {
      return getFilteredOptions(wheelIndex, selections)
    }
    return wheels[wheelIndex]?.options || []
  }

  // ── Actions ──

  function handleDone() {
    const isOther = allowOther && selections[0] === "__other__"
    if (isOther && otherText.trim()) {
      onDone([otherText.trim(), ...selections.slice(1)])
    } else {
      onDone(selections)
    }
    onOpenChange(false)
  }

  // ── Display value ──

  const displayParts = selections.map((val, i) => {
    if (allowOther && i === 0 && val === "__other__") return otherText || "Other"
    const opts = getEffectiveOptions(i)
    return opts.find((o) => o.value === val)?.label || val || "—"
  })
  const displayValue = displayParts.filter(Boolean).join(" · ")

  const isOtherSelected = allowOther && selections[0] === "__other__"
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
            <p className="text-lg font-bold text-navy mt-0.5">{displayValue}</p>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="h-9 w-9 flex items-center justify-center rounded-xl bg-surface-secondary hover:bg-surface-secondary/80 transition-colors"
          >
            <X className="h-4 w-4 text-text-muted" />
          </button>
        </div>

        {/* Picker area */}
        <div className="relative mx-3 rounded-xl overflow-hidden mb-3 bg-surface-secondary" style={{ height: WHEEL_HEIGHT }}>
          {/* Selection band */}
          <div className="absolute inset-x-0 z-10 pointer-events-none" style={{ top: ITEM_HEIGHT * padCount, height: ITEM_HEIGHT }}>
            <div className="h-full mx-2 rounded-xl bg-brand-blue/10 border border-brand-blue/20" />
          </div>

          {/* Fade edges */}
          <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-surface-secondary to-transparent z-[5] pointer-events-none rounded-t-xl" />
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-surface-secondary to-transparent z-[5] pointer-events-none rounded-b-xl" />

          <div className="flex h-full divide-x divide-border-custom/30">
            {wheels.map((wheel, wi) => {
              const opts = getEffectiveOptions(wi)
              const allOpts = allowOther && wi === 0
                ? [...opts, { label: "Other", value: "__other__" }]
                : opts

              return (
                <div key={wi} className="flex-1 relative">
                  {/* Wheel label */}
                  <div className="absolute top-1 left-0 right-0 z-20 text-center">
                    <span className="text-[10px] font-medium uppercase tracking-wide text-text-muted/60">{wheel.label}</span>
                  </div>

                  <div
                    ref={(el) => { wheelRefs.current[wi] = el }}
                    className="tape-scroll-wheel h-full overflow-y-auto"
                    onScroll={() => handleScroll(wi)}
                  >
                    {/* Top padding */}
                    {Array.from({ length: padCount }).map((_, i) => (
                      <div key={`pt-${i}`} style={{ height: ITEM_HEIGHT }} />
                    ))}

                    {allOpts.map((opt) => {
                      const isSelected = selections[wi] === opt.value
                      return (
                        <div
                          key={opt.value}
                          className="tape-scroll-item justify-center px-3"
                          style={{ height: ITEM_HEIGHT }}
                        >
                          <span
                            className={cn(
                              "text-center transition-all duration-150 select-none truncate",
                              isSelected
                                ? "text-base font-bold text-brand-blue"
                                : "text-sm font-medium text-text-muted"
                            )}
                          >
                            {opt.label}
                          </span>
                        </div>
                      )
                    })}

                    {/* Bottom padding */}
                    {Array.from({ length: padCount }).map((_, i) => (
                      <div key={`pb-${i}`} style={{ height: ITEM_HEIGHT }} />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* "Other" text input */}
        {isOtherSelected && (
          <div className="px-5 pb-3">
            <Input
              value={otherText}
              onChange={(e) => setOtherText(e.target.value)}
              placeholder="Enter custom value..."
              className="h-11 text-sm"
              autoFocus
            />
          </div>
        )}

        {/* Footer */}
        <div className="px-5 pb-5 pt-1 flex gap-3">
          <Button
            variant="ghost"
            onClick={() => { onDone([""]); onOpenChange(false) }}
            className="flex-shrink-0 text-text-muted"
          >
            Clear
          </Button>
          <Button
            onClick={handleDone}
            className="flex-1 h-12 bg-brand-orange hover:bg-brand-orange-hover text-white font-semibold text-base rounded-xl"
          >
            <Check className="h-4 w-4 mr-2" />
            Done
          </Button>
        </div>

        {/* Safe area */}
        <div className="pb-safe" />
      </div>
    </div>,
    document.body
  )
}
