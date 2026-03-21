"use client"

import { useState } from "react"
import { Minus, Plus, Pencil, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { useHaptic } from "@/hooks/use-haptic"

interface PanelDimensionEditorProps {
  thickness: number
  lengthFt: number
  lengthIn: number
  onUpdate: (thickness: number, lengthFt: number, lengthIn: number) => void
}

export function PanelDimensionEditor({
  thickness,
  lengthFt,
  lengthIn,
  onUpdate,
}: PanelDimensionEditorProps) {
  const [expanded, setExpanded] = useState(false)
  const haptic = useHaptic()

  const display = lengthIn > 0 ? `${lengthFt}'${lengthIn}"` : `${lengthFt}'`

  function updateThickness(delta: number) {
    const next = Math.min(8, Math.max(2, thickness + delta))
    if (next !== thickness) haptic.light()
    onUpdate(next, lengthFt, lengthIn)
  }

  function updateLengthFt(val: string) {
    const n = parseInt(val) || 0
    const clamped = Math.min(50, Math.max(1, n))
    onUpdate(thickness, clamped, lengthIn)
  }

  function updateLengthIn(delta: number) {
    haptic.light()
    const next = lengthIn + delta
    if (next < 0) {
      if (lengthFt > 1) onUpdate(thickness, lengthFt - 1, 11)
    } else if (next > 11) {
      onUpdate(thickness, lengthFt + 1, 0)
    } else {
      onUpdate(thickness, lengthFt, next)
    }
  }

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => { setExpanded(true); haptic.light() }}
        className={cn(
          "flex items-center gap-2 px-3 py-2.5 rounded-xl",
          "bg-blue-50 border border-blue-200",
          "text-sm font-semibold text-brand-blue",
          "min-h-[44px]", // iOS HIG minimum
          "ios-press transition-all duration-200"
        )}
      >
        <span>{thickness}" × {display}</span>
        <Pencil className="h-3.5 w-3.5 opacity-60" />
      </button>
    )
  }

  return (
    <div className={cn(
      "rounded-xl bg-blue-50 border border-blue-200 p-3",
      "animate-ios-spring-in",
      "space-y-3"
    )}>
      {/* Row 1: Thickness */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">Thickness</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => updateThickness(-1)}
            disabled={thickness <= 2}
            className={cn(
              "h-11 w-11 flex items-center justify-center rounded-xl",
              "bg-white border border-border-custom",
              "disabled:opacity-30 ios-press transition-all"
            )}
          >
            <Minus className="h-4 w-4" />
          </button>
          <span className="text-base font-bold text-navy tabular-nums w-10 text-center">{thickness}"</span>
          <button
            type="button"
            onClick={() => updateThickness(1)}
            disabled={thickness >= 8}
            className={cn(
              "h-11 w-11 flex items-center justify-center rounded-xl",
              "bg-white border border-border-custom",
              "disabled:opacity-30 ios-press transition-all"
            )}
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Row 2: Length */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-text-muted uppercase tracking-wide">Cut Length</span>
        <div className="flex items-center gap-2">
          {/* Feet input */}
          <div className="flex items-center gap-1">
            <input
              type="number"
              value={lengthFt}
              onChange={(e) => updateLengthFt(e.target.value)}
              min={1}
              max={50}
              className={cn(
                "h-11 w-14 text-center text-base font-bold text-navy",
                "border border-border-custom rounded-xl bg-white tabular-nums",
                "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              )}
            />
            <span className="text-base font-bold text-navy">&prime;</span>
          </div>

          {/* Inches stepper */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => updateLengthIn(-1)}
              className={cn(
                "h-11 w-11 flex items-center justify-center rounded-xl",
                "bg-white border border-border-custom ios-press transition-all"
              )}
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="text-base font-bold text-navy tabular-nums w-8 text-center">{lengthIn}&Prime;</span>
            <button
              type="button"
              onClick={() => updateLengthIn(1)}
              className={cn(
                "h-11 w-11 flex items-center justify-center rounded-xl",
                "bg-white border border-border-custom ios-press transition-all"
              )}
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Done button */}
      <button
        type="button"
        onClick={() => { setExpanded(false); haptic.success() }}
        className={cn(
          "w-full flex items-center justify-center gap-2",
          "h-11 rounded-xl",
          "bg-brand-blue text-white font-semibold text-sm",
          "ios-press transition-all"
        )}
      >
        <Check className="h-4 w-4" />
        Done
      </button>
    </div>
  )
}
