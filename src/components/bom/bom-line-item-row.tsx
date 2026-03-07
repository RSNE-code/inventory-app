"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Trash2, Undo2 } from "lucide-react"
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
  checkoutQty?: number
  onQtyChange?: (qty: number) => void
  onInputUnitChange?: (unit: string) => void
  onRemove?: () => void
  onCheckoutQtyChange?: (qty: number) => void
  onReturn?: (qty: number) => void
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
  checkoutQty,
  onQtyChange,
  onInputUnitChange,
  onRemove,
  onCheckoutQtyChange,
  onReturn,
}: BomLineItemRowProps) {
  const [showReturn, setShowReturn] = useState(false)
  const [returnQty, setReturnQty] = useState("")

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

  // Checkout mode render
  if (checkoutMode) {
    return (
      <div className={`py-3 border-b border-border-custom last:border-0 ${fullyCheckedOut ? "opacity-50" : ""}`}>
        <div className="flex items-center gap-2 mb-1">
          <p className="text-sm font-medium text-navy">{name}</p>
          {tier === "TIER_2" && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-purple-50 text-purple-700 border-purple-200 shrink-0">
              T2
            </Badge>
          )}
        </div>

        {/* Progress line */}
        <div className="flex items-end justify-between gap-2 mb-2">
          <div className="text-xs text-text-muted">
            {qtyCheckedOut > 0 ? (
              <span>
                <span className="font-medium text-navy">{formatQuantity(qtyCheckedOut)}</span>
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

          {/* Checkout input */}
          {!fullyCheckedOut && (
            <div className="flex items-center gap-1.5 shrink-0">
              <Input
                type="number"
                value={checkoutQty || ""}
                onChange={(e) => onCheckoutQtyChange?.(e.target.value === "" ? 0 : parseFloat(e.target.value))}
                placeholder={remaining > 0 ? String(Math.max(0, remaining)) : "0"}
                className="h-8 w-16 text-center text-sm"
                min={0}
                step="any"
              />
              <span className="text-[10px] text-text-muted font-medium uppercase w-8">
                {activeInputUnit}
              </span>
            </div>
          )}
        </div>

        {/* Return option */}
        {outstanding > 0 && (
          showReturn ? (
            <div className="flex items-center gap-2 mt-1">
              <Input
                type="number"
                value={returnQty}
                onChange={(e) => setReturnQty(e.target.value)}
                placeholder="Qty"
                className="h-8 w-16 text-center text-sm"
                min={0}
                max={outstanding}
                step="any"
              />
              <span className="text-xs text-text-muted">{activeInputUnit}</span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 text-xs"
                onClick={() => {
                  const qty = parseFloat(returnQty)
                  if (qty > 0) {
                    onReturn?.(qty)
                    setReturnQty("")
                    setShowReturn(false)
                  }
                }}
              >
                Confirm
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 text-xs"
                onClick={() => { setShowReturn(false); setReturnQty("") }}
              >
                Cancel
              </Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowReturn(true)}
              className="flex items-center gap-1 text-xs text-brand-blue hover:underline mt-1"
            >
              <Undo2 className="h-3 w-3" />
              Return material
            </button>
          )
        )}
      </div>
    )
  }

  // Normal (non-checkout, non-edit) render
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
