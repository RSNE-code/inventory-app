"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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

const FEET_OPTIONS = [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 22, 24, 26, 28, 30, 32, 34, 36, 38, 40]
const INCHES_OPTIONS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]

export function PanelLineItemForm({ onAdd, onCancel }: PanelLineItemFormProps) {
  const [thickness, setThickness] = useState<number>(4)
  const [lengthFt, setLengthFt] = useState<string>("")
  const [lengthIn, setLengthIn] = useState<string>("0")
  const [qty, setQty] = useState("")
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Defaults
  const width = 44
  const profile: PanelProfile = "Mesa"
  const color = "White"

  function handleAdd() {
    const errs: Record<string, string> = {}

    const feet = lengthFt ? parseInt(lengthFt) : 0
    if (!feet || feet <= 0) {
      errs.cutLength = "Select feet"
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

    const inches = lengthIn ? parseInt(lengthIn) : 0
    const cutLengthFt = feet + inches / 12
    const cutLengthDisplay = inches > 0 ? `${feet}'${inches}"` : `${feet}'`

    const specs: PanelSpecs = {
      type: "panel",
      thickness,
      cutLengthFt: Math.round(cutLengthFt * 10000) / 10000,
      cutLengthDisplay,
      widthIn: width,
      profile,
      color,
    }

    const displayName = `${thickness}" IMP Panel × ${cutLengthDisplay} cut`

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

      {/* Cut length (ft + in dropdowns) + Quantity */}
      <div className="flex gap-3 items-end">
        <div className="flex-1">
          <p className="text-xs font-medium text-text-muted mb-1.5">Cut Length</p>
          <div className="flex gap-2">
            <Select value={lengthFt} onValueChange={(v) => { setLengthFt(v); setErrors((prev) => { const { cutLength, ...rest } = prev; return rest }) }}>
              <SelectTrigger className={cn("h-11 flex-1", errors.cutLength && "border-status-red")}>
                <SelectValue placeholder="Feet" />
              </SelectTrigger>
              <SelectContent>
                {FEET_OPTIONS.map((ft) => (
                  <SelectItem key={ft} value={String(ft)}>{ft}&apos;</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={lengthIn} onValueChange={setLengthIn}>
              <SelectTrigger className="h-11 w-20">
                <SelectValue placeholder="In" />
              </SelectTrigger>
              <SelectContent>
                {INCHES_OPTIONS.map((inch) => (
                  <SelectItem key={inch} value={String(inch)}>{inch}&quot;</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {errors.cutLength && (
            <p className="text-xs text-status-red mt-0.5">{errors.cutLength}</p>
          )}
        </div>
        <div className="w-24">
          <p className="text-xs font-medium text-text-muted mb-1.5">Qty</p>
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
