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
      <div className="py-4 border-b border-border-custom last:border-0">
        <div className="flex items-center gap-2 mb-2">
          <p className="text-base font-medium text-navy">{name}</p>
          {tier === "TIER_2" && (
            <Badge variant="outline" className="text-xs px-1.5 py-0 bg-purple-50 text-purple-700 border-purple-200 shrink-0">
              T2
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="flex-1">
            <p className="text-sm text-text-muted mb-1">Amount Checked Out</p>
            <p className="text-lg font-semibold text-navy tabular-nums">
              {formatQuantity(outstanding)} <span className="text-sm font-medium">{activeInputUnit}</span>
            </p>
          </div>

          <div className="shrink-0">
            <p className="text-sm text-text-muted mb-1">Amount Returned</p>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={returnQty || ""}
                onChange={(e) => {
                  const val = e.target.value === "" ? 0 : parseFloat(e.target.value)
                  onReturnQtyChange?.(Math.min(Math.max(isNaN(val) ? 0 : val, 0), outstanding))
                }}
                placeholder="0"
                className="h-11 w-24 text-center text-base"
                min={0}
                max={outstanding}
                step="any"
              />
              <span className="text-sm text-text-muted font-medium">
                {activeInputUnit}
              </span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Checkout mode render — enter qty to pull
  if (checkoutMode) {
    return (
      <div className="py-4 border-b border-border-custom last:border-0">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-base font-medium text-navy">{name}</p>
          {fullyCheckedOut && (
            <Check className="h-4 w-4 text-status-green shrink-0" />
          )}
          {tier === "TIER_2" && (
            <Badge variant="outline" className="text-xs px-1.5 py-0 bg-purple-50 text-purple-700 border-purple-200 shrink-0">
              T2
            </Badge>
          )}
        </div>

        <div className="flex items-end justify-between gap-3">
          <div className="text-sm text-text-secondary">
            {qtyCheckedOut > 0 ? (
              <span>
                <span className="font-semibold text-navy">{formatQuantity(qtyCheckedOut)}</span>
                {" of "}
                {formatQuantity(qtyNeeded)} {activeInputUnit} pulled
                {qtyReturned > 0 && (
                  <span className="text-status-green"> · {formatQuantity(qtyReturned)} returned</span>
                )}
              </span>
            ) : (
              <span>Need {formatQuantity(qtyNeeded)} {activeInputUnit}</span>
            )}
          </div>

          {!fullyCheckedOut && (
            <div className="shrink-0">
              <Input
                type="number"
                value={checkoutQty || ""}
                onChange={(e) => onCheckoutQtyChange?.(e.target.value === "" ? 0 : parseFloat(e.target.value))}
                placeholder={remaining > 0 ? String(Math.max(0, remaining)) : "0"}
                className="h-11 w-24 text-center text-base"
                min={0}
                step="any"
              />
              <span className="text-xs text-text-muted font-medium uppercase mt-1 block text-center">
                {activeInputUnit}
              </span>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Normal (non-checkout, non-edit) render — also used for IN_PROGRESS default view
  return (
    <div className="py-4 border-b border-border-custom last:border-0">
      {/* Item name */}
      <div className="flex items-center gap-2 mb-1">
        <p className="text-base font-medium text-navy">{name}</p>
        {fullyCheckedOut && qtyCheckedOut > 0 && (
          <Check className="h-4 w-4 text-status-green shrink-0" />
        )}
        {tier === "TIER_2" && (
          <Badge variant="outline" className="text-xs px-1.5 py-0 bg-purple-50 text-purple-700 border-purple-200 shrink-0">
            T2
          </Badge>
        )}
      </div>

      <div className="flex items-end justify-between gap-3">
        <div>
          {isNonCatalog && nonCatalogCategory && (
            <p className="text-sm text-text-secondary">{nonCatalogCategory}</p>
          )}
          {qtyCheckedOut > 0 && (
            <p className="text-sm text-text-secondary mt-0.5">
              {formatQuantity(qtyCheckedOut)} of {formatQuantity(qtyNeeded)} {activeInputUnit} pulled
              {qtyReturned > 0 && (
                <span className="text-status-green"> · {formatQuantity(qtyReturned)} returned</span>
              )}
            </p>
          )}
        </div>

        {editable ? (
          <div className="flex items-end gap-1.5 shrink-0">
            <div>
              <Input
                type="number"
                value={qtyNeeded || ""}
                onChange={(e) => onQtyChange?.(e.target.value === "" ? 0 : parseFloat(e.target.value))}
                className="h-9 w-18 text-center text-base"
                min={0}
                step="any"
              />
              {showUnitPicker ? (
                <Select value={activeInputUnit} onValueChange={(v) => onInputUnitChange?.(v)}>
                  <SelectTrigger className="h-6 w-18 text-xs font-medium uppercase tracking-wide border-0 bg-transparent px-0 justify-center text-text-muted">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {unitOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <label className="text-xs text-text-muted font-medium uppercase tracking-wide block text-center h-6 leading-6">
                  {activeInputUnit}
                </label>
              )}
            </div>

            {piecesNeeded !== null && (
              <div className="w-18">
                <div className="h-9 rounded-md border border-border-custom bg-surface-secondary flex items-center justify-center">
                  <span className="text-base font-semibold text-navy">{piecesNeeded}</span>
                </div>
                <label className="text-xs text-text-muted font-medium uppercase tracking-wide block text-center h-6 leading-6">
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
              className="h-11 w-11 shrink-0 text-status-red hover:text-status-red hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="text-left shrink-0">
            {piecesNeeded !== null ? (
              <>
                <div>
                  <span className="text-xl font-bold text-navy tabular-nums">
                    {piecesNeeded}
                  </span>
                  <span className="text-base font-medium text-navy ml-1">
                    {unitOfMeasure}
                  </span>
                </div>
                <span className="text-sm text-text-secondary tabular-nums">
                  ({formatQuantity(qtyNeeded)} {activeInputUnit})
                </span>
              </>
            ) : (
              <div>
                <span className="text-xl font-bold text-navy tabular-nums">
                  {formatQuantity(qtyNeeded)}
                </span>
                <span className="text-base font-medium text-navy ml-1">
                  {unitOfMeasure}
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
