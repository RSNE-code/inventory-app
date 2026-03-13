"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { PANEL_THICKNESSES, PANEL_PROFILES, type PanelProfile } from "@/lib/panels"
import { Layers } from "lucide-react"

interface PanelSpecs {
  type: "panel"
  thickness: number
  cutLengthFt: number
  cutLengthDisplay: string
  widthIn: number
  profile: string
  color: string
}

export interface PanelLineItem {
  tempId: string
  productId: null
  productName: string
  sku: null
  unitOfMeasure: string
  tier: "TIER_1"
  qtyNeeded: number
  isNonCatalog: true
  nonCatalogName: string
  nonCatalogCategory: string
  nonCatalogUom: string
  nonCatalogEstCost: null
  nonCatalogSpecs: Record<string, unknown>
}

interface PanelLineItemFormProps {
  onAdd: (item: PanelLineItem) => void
  onCancel: () => void
}

/**
 * Parse a cut length string like "7'6", "7'6\"", "7 6", "9'4", "10" into decimal feet.
 * Supports: 7'6" → 7.5, 9'4 → 9.333, 10 → 10, 7.5 → 7.5
 */
function parseCutLength(input: string): { ft: number; display: string } | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  // Match feet'inches pattern: 7'6, 7'6", 7' 6, 7'06
  const feetInches = trimmed.match(/^(\d+)\s*['′]\s*(\d+)\s*["″]?\s*$/)
  if (feetInches) {
    const feet = parseInt(feetInches[1])
    const inches = parseInt(feetInches[2])
    if (inches >= 12) return null
    const total = feet + inches / 12
    return {
      ft: Math.round(total * 10000) / 10000,
      display: `${feet}'${inches}"`,
    }
  }

  // Match feet only with tick: 10', 8'
  const feetOnly = trimmed.match(/^(\d+)\s*['′]\s*$/)
  if (feetOnly) {
    const feet = parseInt(feetOnly[1])
    return { ft: feet, display: `${feet}'` }
  }

  // Plain number — treat as feet
  const num = parseFloat(trimmed)
  if (!isNaN(num) && num > 0) {
    // If it has a fractional part, format nicely
    const wholeFeet = Math.floor(num)
    const remainingInches = Math.round((num - wholeFeet) * 12)
    if (remainingInches > 0 && remainingInches < 12) {
      return { ft: num, display: `${wholeFeet}'${remainingInches}"` }
    }
    return { ft: num, display: `${wholeFeet}'` }
  }

  return null
}

export function PanelLineItemForm({ onAdd, onCancel }: PanelLineItemFormProps) {
  const [thickness, setThickness] = useState<number>(4)
  const [cutLengthInput, setCutLengthInput] = useState("")
  const [qty, setQty] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Defaults
  const width = 44
  const profile: PanelProfile = "Mesa"
  const color = "White"

  function handleAdd() {
    const errs: Record<string, string> = {}

    const parsed = parseCutLength(cutLengthInput)
    if (!parsed) {
      errs.cutLength = "Enter a valid cut length (e.g., 7'6\" or 10)"
    }

    const qtyNum = parseFloat(qty)
    if (!qty || isNaN(qtyNum) || qtyNum <= 0) {
      errs.qty = "Enter quantity"
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }

    setErrors({})

    const specs: PanelSpecs = {
      type: "panel",
      thickness,
      cutLengthFt: parsed!.ft,
      cutLengthDisplay: parsed!.display,
      widthIn: width,
      profile,
      color,
    }

    const displayName = `${thickness}" IMP Panel × ${parsed!.display} cut`

    const item: PanelLineItem = {
      tempId: crypto.randomUUID(),
      productId: null,
      productName: displayName,
      sku: null,
      unitOfMeasure: "panel",
      tier: "TIER_1",
      qtyNeeded: qtyNum,
      isNonCatalog: true,
      nonCatalogName: displayName,
      nonCatalogCategory: "Insulated Metal Panel",
      nonCatalogUom: "panel",
      nonCatalogEstCost: null,
      nonCatalogSpecs: specs as unknown as Record<string, unknown>,
    }

    onAdd(item)
  }

  return (
    <div className="space-y-3 p-4 bg-surface-secondary rounded-xl border border-border-custom">
      <div className="flex items-center gap-2">
        <Layers className="h-4 w-4 text-brand-blue" />
        <p className="text-sm font-semibold text-navy">Panel Line Item</p>
      </div>

      {/* Thickness pills */}
      <div>
        <p className="text-xs font-medium text-text-muted mb-1.5">Thickness</p>
        <div className="flex gap-2">
          {PANEL_THICKNESSES.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setThickness(t)}
              className={cn(
                "h-9 px-4 rounded-lg text-sm font-semibold transition-all",
                thickness === t
                  ? "bg-brand-blue text-white shadow-sm"
                  : "bg-white border border-border-custom text-navy hover:border-brand-blue/40"
              )}
            >
              {t}"
            </button>
          ))}
        </div>
      </div>

      {/* Cut length + Quantity */}
      <div className="flex gap-3">
        <div className="flex-1">
          <p className="text-xs font-medium text-text-muted mb-1.5">Cut Length</p>
          <Input
            value={cutLengthInput}
            onChange={(e) => {
              setCutLengthInput(e.target.value)
              setErrors((prev) => { const { cutLength, ...rest } = prev; return rest })
            }}
            placeholder="e.g., 7'6&quot; or 10"
            className={cn("h-11", errors.cutLength && "border-status-red")}
          />
          {errors.cutLength && (
            <p className="text-xs text-status-red mt-0.5">{errors.cutLength}</p>
          )}
        </div>
        <div className="w-24">
          <p className="text-xs font-medium text-text-muted mb-1.5">Qty (panels)</p>
          <Input
            type="number"
            value={qty}
            onChange={(e) => {
              setQty(e.target.value)
              setErrors((prev) => { const { qty, ...rest } = prev; return rest })
            }}
            placeholder="20"
            className={cn("h-11 text-center", errors.qty && "border-status-red")}
            min={1}
            step="1"
          />
          {errors.qty && (
            <p className="text-xs text-status-red mt-0.5">{errors.qty}</p>
          )}
        </div>
      </div>

      {/* Defaults display */}
      <div className="flex items-center gap-1.5 flex-wrap">
        <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
          {width}" wide
        </Badge>
        <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
          {profile}
        </Badge>
        <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
          {color}
        </Badge>
        <span className="text-xs text-text-muted">Standard defaults</span>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <Button
          type="button"
          size="sm"
          onClick={handleAdd}
          className="bg-brand-blue hover:bg-brand-blue/90 text-white"
        >
          Add Panel
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={onCancel}
        >
          Cancel
        </Button>
      </div>
    </div>
  )
}
