"use client"

import { useState } from "react"
import { Minus, Plus, Pencil } from "lucide-react"

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

  const display = lengthIn > 0 ? `${lengthFt}'${lengthIn}"` : `${lengthFt}'`

  function updateThickness(delta: number) {
    const next = Math.min(8, Math.max(2, thickness + delta))
    onUpdate(next, lengthFt, lengthIn)
  }

  function updateLengthFt(val: string) {
    const n = parseInt(val) || 0
    const clamped = Math.min(50, Math.max(1, n))
    onUpdate(thickness, clamped, lengthIn)
  }

  function updateLengthIn(delta: number) {
    const next = lengthIn + delta
    if (next < 0) {
      // Wrap: 0 - 1 = borrow from feet
      if (lengthFt > 1) onUpdate(thickness, lengthFt - 1, 11)
    } else if (next > 11) {
      // Wrap: 11 + 1 = add to feet
      onUpdate(thickness, lengthFt + 1, 0)
    } else {
      onUpdate(thickness, lengthFt, next)
    }
  }

  if (!expanded) {
    return (
      <button
        type="button"
        onClick={() => setExpanded(true)}
        className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-blue-50 border border-blue-200 text-xs font-medium text-brand-blue"
      >
        <span>{thickness}" x {display}</span>
        <Pencil className="h-3 w-3" />
      </button>
    )
  }

  return (
    <div className="flex items-center gap-3 px-2 py-2 rounded-lg bg-blue-50 border border-blue-200">
      {/* Thickness */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => updateThickness(-1)}
          disabled={thickness <= 2}
          className="h-7 w-7 flex items-center justify-center rounded-md bg-white border border-border-custom disabled:opacity-30"
        >
          <Minus className="h-3 w-3" />
        </button>
        <span className="text-sm font-bold text-navy tabular-nums w-8 text-center">{thickness}"</span>
        <button
          type="button"
          onClick={() => updateThickness(1)}
          disabled={thickness >= 8}
          className="h-7 w-7 flex items-center justify-center rounded-md bg-white border border-border-custom disabled:opacity-30"
        >
          <Plus className="h-3 w-3" />
        </button>
      </div>

      <span className="text-xs text-text-muted">x</span>

      {/* Length feet */}
      <div className="flex items-center gap-0.5">
        <input
          type="number"
          value={lengthFt}
          onChange={(e) => updateLengthFt(e.target.value)}
          min={1}
          max={50}
          className="h-7 w-10 text-center text-sm font-bold text-navy border border-border-custom rounded-md bg-white tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <span className="text-sm font-bold text-navy">'</span>
      </div>

      {/* Length inches */}
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => updateLengthIn(-1)}
          className="h-7 w-7 flex items-center justify-center rounded-md bg-white border border-border-custom"
        >
          <Minus className="h-3 w-3" />
        </button>
        <span className="text-sm font-bold text-navy tabular-nums w-6 text-center">{lengthIn}"</span>
        <button
          type="button"
          onClick={() => updateLengthIn(1)}
          className="h-7 w-7 flex items-center justify-center rounded-md bg-white border border-border-custom"
        >
          <Plus className="h-3 w-3" />
        </button>
      </div>

      {/* Done */}
      <button
        type="button"
        onClick={() => setExpanded(false)}
        className="text-xs font-bold text-brand-blue ml-auto"
      >
        Done
      </button>
    </div>
  )
}
