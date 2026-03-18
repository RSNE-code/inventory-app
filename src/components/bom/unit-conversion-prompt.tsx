"use client"

import { useState } from "react"
import { Minus, Plus, Check, RefreshCw } from "lucide-react"

interface UnitConversionPromptProps {
  parsedQty: number
  parsedUnit: string
  catalogUnit: string
  knownFactor?: number
  onConfirm: (factor: number) => void
}

export function UnitConversionPrompt({
  parsedQty,
  parsedUnit,
  catalogUnit,
  knownFactor,
  onConfirm,
}: UnitConversionPromptProps) {
  const [factor, setFactor] = useState(knownFactor ?? 1)
  const [editing, setEditing] = useState(!knownFactor)

  // Already resolved — show compact pill
  if (!editing && knownFactor) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-green-50 border border-green-200 text-xs font-medium text-green-700"
      >
        <Check className="h-3 w-3" />
        <span>{parsedQty} {parsedUnit} = {parsedQty * knownFactor} {catalogUnit}</span>
        <RefreshCw className="h-3 w-3 text-green-400" />
      </button>
    )
  }

  function updateFactor(delta: number) {
    setFactor((prev) => Math.max(1, prev + delta))
  }

  return (
    <div className="flex items-center gap-2 px-2 py-2 rounded-lg bg-amber-50 border border-amber-200">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-amber-800">
          How many {catalogUnit} in 1 {parsedUnit.replace(/s$/, "")}?
        </p>
      </div>

      {/* Factor stepper */}
      <div className="flex items-center gap-0 shrink-0">
        <button
          type="button"
          onClick={() => updateFactor(-1)}
          disabled={factor <= 1}
          className="h-7 w-7 flex items-center justify-center rounded-l-md bg-white border border-border-custom disabled:opacity-30"
        >
          <Minus className="h-3 w-3" />
        </button>
        <input
          type="number"
          value={factor}
          onChange={(e) => setFactor(Math.max(1, Number(e.target.value) || 1))}
          className="w-12 h-7 text-center text-sm font-bold border-y border-border-custom bg-white tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          min={1}
        />
        <button
          type="button"
          onClick={() => updateFactor(1)}
          className="h-7 w-7 flex items-center justify-center rounded-r-md bg-white border border-border-custom"
        >
          <Plus className="h-3 w-3" />
        </button>
      </div>

      {/* Confirm */}
      <button
        type="button"
        onClick={() => {
          setEditing(false)
          onConfirm(factor)
        }}
        className="h-7 px-2 rounded-md bg-amber-500 text-white text-xs font-bold shrink-0"
      >
        OK
      </button>
    </div>
  )
}
