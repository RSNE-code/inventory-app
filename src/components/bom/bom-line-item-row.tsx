"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { OptionPicker } from "@/components/doors/option-picker"
import { Trash2, Check, Wrench, Truck, AlertTriangle } from "lucide-react"
import { formatQuantity } from "@/lib/utils"
import { STANDARD_UNITS } from "@/lib/units"

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
  fabricationSource?: string | null
  onFabricationSourceChange?: (source: "RSNE_MADE" | "SUPPLIER") => void
  missingFabOrder?: boolean
}

// Convert a dimension value to feet
function toFeet(value: number, unit: string): number {
  return unit === "in" ? value / 12 : value
}

/** Build the picker options: dimension-based options first, then standard units (deduped) */
function buildPickerOptions(
  hasLength: boolean,
  hasArea: boolean,
  unitOfMeasure: string
): { label: string; value: string }[] {
  const seen = new Set<string>()
  const options: { label: string; value: string }[] = []

  // Dimension-based options first (if applicable)
  if (hasLength || hasArea) {
    for (const u of ["ft", "in"]) {
      options.push({ label: u, value: u })
      seen.add(u)
    }
    if (hasArea) {
      options.push({ label: "sq ft", value: "sq ft" })
      seen.add("sq ft")
    }
  }

  // Product's base unit
  if (unitOfMeasure && !seen.has(unitOfMeasure)) {
    options.push({ label: unitOfMeasure, value: unitOfMeasure })
    seen.add(unitOfMeasure)
  }

  // Standard units (deduped)
  for (const u of STANDARD_UNITS) {
    if (!seen.has(u.value)) {
      options.push(u)
      seen.add(u.value)
    }
  }

  return options
}

// Static unit pill (view, checkout, return modes)
function UnitPill({ unit }: { unit: string }) {
  return (
    <span className="inline-flex items-center justify-center h-7 w-[52px] text-center text-xs font-semibold text-brand-blue bg-brand-blue/10 rounded-xl">
      {unit}
    </span>
  )
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
  fabricationSource,
  onFabricationSourceChange,
  missingFabOrder,
}: BomLineItemRowProps) {
  const [pickerOpen, setPickerOpen] = useState(false)

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

  // Build picker options
  const pickerOptions = buildPickerOptions(!!hasLength, !!hasArea, unitOfMeasure)

  // Checkout progress
  const outstanding = qtyCheckedOut - qtyReturned
  const remaining = qtyNeeded - qtyCheckedOut
  const fullyCheckedOut = qtyCheckedOut >= qtyNeeded && qtyNeeded > 0

  // Return mode render — only items with outstanding material
  if (returnMode) {
    if (outstanding <= 0) return null

    return (
      <div className="py-3 border-b border-border-custom last:border-0">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="text-[15px] font-medium text-navy truncate">{name}</p>
              {tier === "TIER_2" && (
                <Badge variant="outline" className="text-[10px] px-1 py-0 bg-purple-50 text-purple-700 border-purple-200 shrink-0">T2</Badge>
              )}
            </div>
            <p className="text-xs text-text-muted mt-0.5">{formatQuantity(outstanding)} {activeInputUnit} out</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Input
              type="number"
              value={returnQty || ""}
              onChange={(e) => {
                const val = e.target.value === "" ? 0 : parseFloat(e.target.value)
                onReturnQtyChange?.(Math.min(Math.max(isNaN(val) ? 0 : val, 0), outstanding))
              }}
              placeholder="0"
              className="h-11 w-20 text-center text-[15px] rounded-xl"
              min={0}
              max={outstanding}
              step="any"
            />
            <UnitPill unit={activeInputUnit} />
          </div>
        </div>
      </div>
    )
  }

  // Checkout mode render — enter qty to pull
  if (checkoutMode) {
    return (
      <div className="py-3 border-b border-border-custom last:border-0">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <p className="text-[15px] font-medium text-navy truncate">{name}</p>
              {fullyCheckedOut && <Check className="h-3.5 w-3.5 text-status-green shrink-0" />}
              {tier === "TIER_2" && (
                <Badge variant="outline" className="text-[10px] px-1 py-0 bg-purple-50 text-purple-700 border-purple-200 shrink-0">T2</Badge>
              )}
            </div>
            <p className="text-xs text-text-muted mt-0.5">
              {qtyCheckedOut > 0 ? (
                <>{formatQuantity(qtyCheckedOut)}/{formatQuantity(qtyNeeded)} {activeInputUnit} pulled</>
              ) : (
                <>Need {formatQuantity(qtyNeeded)} {activeInputUnit}</>
              )}
            </p>
          </div>
          {!fullyCheckedOut && (
            <div className="flex items-center gap-2 shrink-0">
              <Input
                type="number"
                value={checkoutQty || ""}
                onChange={(e) => onCheckoutQtyChange?.(e.target.value === "" ? 0 : parseFloat(e.target.value))}
                placeholder={remaining > 0 ? String(Math.max(0, remaining)) : "0"}
                className="h-11 w-20 text-center text-[15px] rounded-xl"
                min={0}
                step="any"
              />
              <UnitPill unit={activeInputUnit} />
            </div>
          )}
        </div>
      </div>
    )
  }

  // Normal view render
  return (
    <div className="py-3 border-b border-border-custom last:border-0">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="text-[15px] font-medium text-navy truncate">{name}</p>
            {fullyCheckedOut && qtyCheckedOut > 0 && <Check className="h-3.5 w-3.5 text-status-green shrink-0" />}
            {tier === "TIER_2" && (
              <Badge variant="outline" className="text-[10px] px-1 py-0 bg-purple-50 text-purple-700 border-purple-200 shrink-0">T2</Badge>
            )}
          </div>
          {isNonCatalog && nonCatalogCategory && (
            <p className="text-xs text-text-muted">{nonCatalogCategory}</p>
          )}
          {/* Missing fab order warning */}
          {missingFabOrder && (
            <span className="inline-flex items-center gap-1 mt-1 px-2 py-1 rounded-lg text-[11px] font-semibold bg-status-yellow/15 text-yellow-700 border border-yellow-200">
              <AlertTriangle className="h-3 w-3" />
              No fab order
            </span>
          )}
          {/* Fabrication source badge */}
          {fabricationSource && (
            editable && onFabricationSourceChange ? (
              <button
                type="button"
                onClick={() => onFabricationSourceChange(
                  fabricationSource === "RSNE_MADE" ? "SUPPLIER" : "RSNE_MADE"
                )}
                className={`inline-flex items-center gap-1 mt-1 px-3 py-1.5 min-h-[44px] rounded-xl text-[11px] font-semibold transition-colors ${
                  fabricationSource === "RSNE_MADE"
                    ? "bg-status-green/10 text-green-700 border border-green-200 active:bg-green-100"
                    : "bg-blue-50 text-blue-700 border border-blue-200 active:bg-blue-100"
                }`}
              >
                {fabricationSource === "RSNE_MADE" ? (
                  <><Wrench className="h-3 w-3" /> In-house</>
                ) : (
                  <><Truck className="h-3 w-3" /> Supplier</>
                )}
              </button>
            ) : (
              <span className={`inline-flex items-center gap-1 mt-0.5 px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                fabricationSource === "RSNE_MADE"
                  ? "bg-status-green/10 text-green-700"
                  : "bg-blue-50 text-blue-700"
              }`}>
                {fabricationSource === "RSNE_MADE" ? (
                  <><Wrench className="h-3 w-3" /> In-house</>
                ) : (
                  <><Truck className="h-3 w-3" /> Supplier</>
                )}
              </span>
            )
          )}
          {qtyCheckedOut > 0 && (
            <p className="text-xs text-text-muted">
              {formatQuantity(qtyCheckedOut)}/{formatQuantity(qtyNeeded)} {activeInputUnit} pulled
              {qtyReturned > 0 && <span className="text-status-green"> · {formatQuantity(qtyReturned)} ret</span>}
            </p>
          )}
        </div>

        {editable ? (
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="flex flex-col items-center">
              <Input
                type="number"
                value={qtyNeeded || ""}
                onChange={(e) => onQtyChange?.(e.target.value === "" ? 0 : parseFloat(e.target.value))}
                className="h-11 w-16 text-center text-[15px] rounded-xl"
                min={0}
                step="any"
              />
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="mt-0.5 h-8 w-[52px] text-center text-xs font-semibold text-brand-blue bg-brand-blue/10 border border-brand-blue/20 rounded-xl active:bg-brand-blue/20 transition-colors"
              >
                {activeInputUnit}
              </button>
              <OptionPicker
                open={pickerOpen}
                onOpenChange={setPickerOpen}
                label="Unit of Measure"
                wheels={[{ label: "Unit", options: pickerOptions }]}
                selectedValues={[activeInputUnit]}
                onDone={([unit]) => {
                  if (unit && unit !== activeInputUnit) {
                    onInputUnitChange?.(unit)
                  }
                }}
              />
            </div>
            {piecesNeeded !== null && (
              <div className="w-16">
                <div className="h-8 rounded-xl border border-border-custom bg-surface-secondary flex items-center justify-center">
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
              className="h-11 w-11 shrink-0 rounded-xl text-status-red hover:text-status-red hover:bg-status-red/10"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <div className="text-right shrink-0 flex items-center gap-1.5">
            {piecesNeeded !== null ? (
              <div>
                <span className="text-base font-bold text-navy tabular-nums">{piecesNeeded}</span>
                <span className="text-sm text-navy ml-0.5">{unitOfMeasure}</span>
                <p className="text-xs text-text-muted tabular-nums">({formatQuantity(qtyNeeded)} {activeInputUnit})</p>
              </div>
            ) : (
              <>
                <span className="text-base font-bold text-navy tabular-nums">{formatQuantity(qtyNeeded)}</span>
                <UnitPill unit={activeInputUnit} />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
