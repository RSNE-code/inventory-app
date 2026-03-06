"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Trash2 } from "lucide-react"
import { formatQuantity } from "@/lib/utils"

interface BomLineItemRowProps {
  name: string
  sku?: string | null
  unitOfMeasure: string
  dimLength?: number | null
  dimLengthUnit?: string | null
  dimWidth?: number | null
  dimWidthUnit?: string | null
  tier: string
  qtyNeeded: number
  inputUnit?: string
  isNonCatalog?: boolean
  nonCatalogCategory?: string | null
  qtyCheckedOut?: number
  qtyReturned?: number
  editable?: boolean
  onQtyChange?: (qty: number) => void
  onInputUnitChange?: (unit: string) => void
  onRemove?: () => void
}

// Convert a dimension value to feet
function toFeet(value: number, unit: string): number {
  return unit === "in" ? value / 12 : value
}

export function BomLineItemRow({
  name,
  sku,
  unitOfMeasure,
  dimLength,
  dimLengthUnit,
  dimWidth,
  dimWidthUnit,
  tier,
  qtyNeeded,
  inputUnit: inputUnitProp,
  isNonCatalog,
  nonCatalogCategory,
  qtyCheckedOut = 0,
  qtyReturned = 0,
  editable = false,
  onQtyChange,
  onInputUnitChange,
  onRemove,
}: BomLineItemRowProps) {
  const hasLength = dimLength && dimLength > 0
  const hasWidth = dimWidth && dimWidth > 0
  const hasArea = hasLength && hasWidth

  // Calculate area per piece in sq ft (if both length and width exist)
  const areaPerPieceSqFt = hasArea
    ? toFeet(dimLength, dimLengthUnit || "ft") * toFeet(dimWidth, dimWidthUnit || "ft")
    : null

  // Default input unit logic:
  // - Has area → default to sq ft
  // - Has length only → default to length unit
  // - Otherwise → product's unit of measure
  const defaultInputUnit = hasArea ? "sq ft" : hasLength ? (dimLengthUnit || "ft") : unitOfMeasure
  const activeInputUnit = inputUnitProp || defaultInputUnit

  // Calculate pieces
  let piecesNeeded: number | null = null
  if (qtyNeeded > 0) {
    if (activeInputUnit === "sq ft" && areaPerPieceSqFt && areaPerPieceSqFt > 0) {
      // Area-based: sq ft input ÷ sq ft per piece
      piecesNeeded = Math.ceil(qtyNeeded / areaPerPieceSqFt)
    } else if (hasLength) {
      const lengthInFt = toFeet(dimLength, dimLengthUnit || "ft")
      if (activeInputUnit === "ft") {
        piecesNeeded = Math.ceil(qtyNeeded / lengthInFt)
      } else if (activeInputUnit === "in") {
        piecesNeeded = Math.ceil((qtyNeeded / 12) / lengthInFt)
      }
    }
  }

  // Build unit options for the dropdown
  const unitOptions: { value: string; label: string }[] = []
  if (hasLength || hasArea) {
    unitOptions.push({ value: "ft", label: "ft" })
    unitOptions.push({ value: "in", label: "in" })
    if (hasArea) {
      unitOptions.push({ value: "sq ft", label: "sq ft" })
    }
    if (unitOfMeasure !== "ft" && unitOfMeasure !== "in" && unitOfMeasure !== "sq ft") {
      unitOptions.push({ value: unitOfMeasure, label: unitOfMeasure })
    }
  }
  const showUnitPicker = editable && unitOptions.length > 0

  return (
    <div className="py-3 border-b border-border-custom last:border-0">
      {/* Item name — always full width on its own line */}
      <div className="flex items-center gap-2 mb-1">
        <p className="text-sm font-medium text-navy">{name}</p>
        {tier === "TIER_2" && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-purple-50 text-purple-700 border-purple-200 shrink-0">
            T2
          </Badge>
        )}
      </div>

      <div className="flex items-end justify-between gap-2">
        <p className="text-xs text-text-muted">
          {isNonCatalog ? (nonCatalogCategory || "Non-catalog") : (sku || "No SKU")}
        </p>

        {editable ? (
          <div className="flex items-end gap-1.5 shrink-0">
            {/* Qty input + unit picker */}
            <div>
              {showUnitPicker ? (
                <Select value={activeInputUnit} onValueChange={(v) => onInputUnitChange?.(v)}>
                  <SelectTrigger className="h-6 w-16 text-[10px] font-medium uppercase tracking-wide border-0 bg-transparent px-0 justify-center text-text-muted">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {unitOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <label className="text-[10px] text-text-muted font-medium uppercase tracking-wide block text-center h-6 leading-6">
                  {activeInputUnit}
                </label>
              )}
              <Input
                type="number"
                value={qtyNeeded || ""}
                onChange={(e) => onQtyChange?.(e.target.value === "" ? 0 : parseFloat(e.target.value))}
                className="h-8 w-16 text-center text-sm"
                min={0}
                step="any"
              />
            </div>

            {/* Pieces display */}
            {piecesNeeded !== null && (
              <div className="w-16">
                <label className="text-[10px] text-text-muted font-medium uppercase tracking-wide block text-center h-6 leading-6">
                  {unitOfMeasure}
                </label>
                <div className="h-8 rounded-md border border-border-custom bg-surface-secondary flex items-center justify-center">
                  <span className="text-sm font-semibold text-navy">{piecesNeeded}</span>
                </div>
              </div>
            )}

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onRemove}
              className="h-8 w-8 shrink-0 text-status-red hover:text-status-red hover:bg-red-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <div className="text-right shrink-0">
            {piecesNeeded !== null ? (
              <>
                <div>
                  <span className="text-lg font-bold text-navy tabular-nums">
                    {piecesNeeded}
                  </span>
                  <span className="text-sm font-medium text-navy ml-1">
                    {unitOfMeasure}
                  </span>
                </div>
                <span className="text-xs text-text-muted tabular-nums">
                  ({formatQuantity(qtyNeeded)} {activeInputUnit})
                </span>
              </>
            ) : (
              <div>
                <span className="text-lg font-bold text-navy tabular-nums">
                  {formatQuantity(qtyNeeded)}
                </span>
                <span className="text-sm font-medium text-navy ml-1">
                  {unitOfMeasure}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {qtyCheckedOut > 0 && (
        <p className="text-xs text-text-muted mt-1">
          Checked out: {formatQuantity(qtyCheckedOut)}
          {qtyReturned > 0 && ` · Returned: ${formatQuantity(qtyReturned)}`}
        </p>
      )}
    </div>
  )
}
