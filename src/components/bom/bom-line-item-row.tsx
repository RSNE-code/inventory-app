"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Trash2, Check } from "lucide-react"
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
  checkoutMode?: boolean
  returnMode?: boolean
  checkoutQty?: number
  returnQty?: number
  onQtyChange?: (qty: number) => void
  onInputUnitChange?: (unit: string) => void
  onRemove?: () => void
  onCheckoutQtyChange?: (qty: number) => void
  onReturnQtyChange?: (qty: number) => void
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
  checkoutMode = false,
  returnMode = false,
  checkoutQty,
  returnQty,
  onQtyChange,
  onInputUnitChange,
  onRemove,
  onCheckoutQtyChange,
  onReturnQtyChange,
}: BomLineItemRowProps) {
  const hasLength = dimLength && dimLength > 0
  const hasWidth = dimWidth && dimWidth > 0
  const hasArea = hasLength && hasWidth

  // Calculate area per piece in sq ft (if both length and width exist)
  const areaPerPieceSqFt = hasArea
    ? toFeet(dimLength, dimLengthUnit || "ft") * toFeet(dimWidth, dimWidthUnit || "ft")
    : null

  const defaultInputUnit = hasArea ? "sq ft" : hasLength ? (dimLengthUnit || "ft") : unitOfMeasure
  const activeInputUnit = inputUnitProp || defaultInputUnit

  // Calculate pieces
  let piecesNeeded: number | null = null
  if (qtyNeeded > 0) {
    if (activeInputUnit === "sq ft" && areaPerPieceSqFt && areaPerPieceSqFt > 0) {
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

  // Checkout progress
  const outstanding = qtyCheckedOut - qtyReturned
  const remaining = qtyNeeded - qtyCheckedOut
  const fullyCheckedOut = qtyCheckedOut >= qtyNeeded && qtyNeeded > 0

  // Return mode render — only items with outstanding material
  if (returnMode) {
    if (outstanding <= 0) return null

    return (
      <div className="py-2 border-b border-border-custom last:border-0">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-medium text-navy truncate">{name}</p>
              {tier === "TIER_2" && (
                <Badge variant="outline" className="text-[10px] px-1 py-0 bg-purple-50 text-purple-700 border-purple-200 shrink-0">T2</Badge>
              )}
            </div>
            <p className="text-xs text-text-muted">{formatQuantity(outstanding)} {activeInputUnit} out</p>
          </div>
          <div className="flex items-center gap-0 shrink-0">
            <button
              type="button"
              onClick={() => onReturnQtyChange?.(Math.max(0, (returnQty ?? outstanding) - 1))}
              className="h-9 w-9 flex items-center justify-center rounded-l-lg border border-border-custom bg-surface-secondary text-navy font-bold text-lg hover:bg-gray-100 active:bg-gray-200"
            >
              −
            </button>
            <div className="h-9 w-14 flex items-center justify-center border-y border-border-custom text-sm font-semibold text-navy tabular-nums">
              {returnQty ?? outstanding}
            </div>
            <button
              type="button"
              onClick={() => onReturnQtyChange?.(Math.min(outstanding, (returnQty ?? outstanding) + 1))}
              disabled={(returnQty ?? outstanding) >= outstanding}
              className="h-9 w-9 flex items-center justify-center rounded-r-lg border border-border-custom bg-surface-secondary text-navy font-bold text-lg hover:bg-gray-100 active:bg-gray-200 disabled:opacity-30"
            >
              +
            </button>
            <span className="text-xs text-text-muted w-8 ml-1.5">{activeInputUnit}</span>
          </div>
        </div>
      </div>
    )
  }

  // Checkout mode render — enter qty to pull
  if (checkoutMode) {
    return (
      <div className="py-2 border-b border-border-custom last:border-0">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="text-sm font-medium text-navy truncate">{name}</p>
              {fullyCheckedOut && <Check className="h-3.5 w-3.5 text-status-green shrink-0" />}
              {tier === "TIER_2" && (
                <Badge variant="outline" className="text-[10px] px-1 py-0 bg-purple-50 text-purple-700 border-purple-200 shrink-0">T2</Badge>
              )}
            </div>
            <p className="text-xs text-text-muted">
              {qtyCheckedOut > 0 ? (
                <>{formatQuantity(qtyCheckedOut)}/{formatQuantity(qtyNeeded)} {activeInputUnit} pulled</>
              ) : (
                <>Need {formatQuantity(qtyNeeded)} {activeInputUnit}</>
              )}
            </p>
          </div>
          {!fullyCheckedOut && (
            <div className="flex items-center gap-1.5 shrink-0">
              <Input
                type="number"
                value={checkoutQty || ""}
                onChange={(e) => onCheckoutQtyChange?.(e.target.value === "" ? 0 : parseFloat(e.target.value))}
                placeholder={remaining > 0 ? String(Math.max(0, remaining)) : "0"}
                className="h-9 w-20 text-center text-sm"
                min={0}
                step="any"
              />
              <span className="text-xs text-text-muted w-8">{activeInputUnit}</span>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Normal view render
  return (
    <div className="py-2 border-b border-border-custom last:border-0">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-medium text-navy truncate">{name}</p>
            {fullyCheckedOut && qtyCheckedOut > 0 && <Check className="h-3.5 w-3.5 text-status-green shrink-0" />}
            {tier === "TIER_2" && (
              <Badge variant="outline" className="text-[10px] px-1 py-0 bg-purple-50 text-purple-700 border-purple-200 shrink-0">T2</Badge>
            )}
          </div>
          {isNonCatalog && nonCatalogCategory && (
            <p className="text-xs text-text-muted">{nonCatalogCategory}</p>
          )}
          {qtyCheckedOut > 0 && (
            <p className="text-xs text-text-muted">
              {formatQuantity(qtyCheckedOut)}/{formatQuantity(qtyNeeded)} {activeInputUnit} pulled
              {qtyReturned > 0 && <span className="text-status-green"> · {formatQuantity(qtyReturned)} ret</span>}
            </p>
          )}
        </div>

        {editable ? (
          <div className="flex items-center gap-1 shrink-0">
            <div>
              <Input
                type="number"
                value={qtyNeeded || ""}
                onChange={(e) => onQtyChange?.(e.target.value === "" ? 0 : parseFloat(e.target.value))}
                className="h-8 w-16 text-center text-sm"
                min={0}
                step="any"
              />
              {showUnitPicker ? (
                <Select value={activeInputUnit} onValueChange={(v) => onInputUnitChange?.(v)}>
                  <SelectTrigger className="h-5 w-16 text-[10px] font-medium uppercase border-0 bg-transparent px-0 justify-center text-text-muted">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {unitOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <label className="text-[10px] text-text-muted font-medium uppercase block text-center h-5 leading-5">
                  {activeInputUnit}
                </label>
              )}
            </div>
            {piecesNeeded !== null && (
              <div className="w-16">
                <div className="h-8 rounded-md border border-border-custom bg-surface-secondary flex items-center justify-center">
                  <span className="text-sm font-semibold text-navy">{piecesNeeded}</span>
                </div>
                <label className="text-[10px] text-text-muted font-medium uppercase block text-center h-5 leading-5">
                  {unitOfMeasure}
                </label>
              </div>
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label="Remove item"
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
                <span className="text-base font-bold text-navy tabular-nums">{piecesNeeded}</span>
                <span className="text-sm text-navy ml-0.5">{unitOfMeasure}</span>
                <p className="text-xs text-text-muted tabular-nums">({formatQuantity(qtyNeeded)} {activeInputUnit})</p>
              </>
            ) : (
              <>
                <span className="text-base font-bold text-navy tabular-nums">{formatQuantity(qtyNeeded)}</span>
                <span className="text-sm text-navy ml-0.5">{unitOfMeasure}</span>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
