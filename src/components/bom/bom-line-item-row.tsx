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
  pieceUnit?: string | null
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

export function BomLineItemRow({
  name,
  sku,
  unitOfMeasure,
  dimLength,
  dimLengthUnit,
  pieceUnit,
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
  const hasDimension = dimLength && dimLength > 0
  const dimUnit = dimLengthUnit || "ft"

  // The active input unit — either what the user selected, or auto-detected
  const activeInputUnit = inputUnitProp || (hasDimension ? dimUnit : unitOfMeasure)

  // Calculate pieces based on the input unit
  let piecesNeeded: number | null = null
  if (hasDimension && activeInputUnit === dimUnit) {
    // Input is in the same unit as the dimension — direct conversion
    piecesNeeded = Math.ceil(qtyNeeded / dimLength)
  } else if (hasDimension && activeInputUnit === "in" && dimUnit === "ft") {
    // Input in inches, dimension in feet
    piecesNeeded = Math.ceil((qtyNeeded / 12) / dimLength)
  } else if (hasDimension && activeInputUnit === "ft" && dimUnit === "in") {
    // Input in feet, dimension in inches
    piecesNeeded = Math.ceil((qtyNeeded * 12) / dimLength)
  }

  // Build unit options for the dropdown
  const unitOptions: { value: string; label: string }[] = []
  if (hasDimension) {
    unitOptions.push({ value: "ft", label: "ft" })
    unitOptions.push({ value: "in", label: "in" })
    if (unitOfMeasure !== "ft" && unitOfMeasure !== "in") {
      unitOptions.push({ value: unitOfMeasure, label: unitOfMeasure })
    }
  }
  const showUnitPicker = editable && unitOptions.length > 0

  return (
    <div className="py-3 border-b border-border-custom last:border-0">
      <div className="flex items-start gap-2 mb-1">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-navy truncate">{name}</p>
            {tier === "TIER_2" && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-purple-50 text-purple-700 border-purple-200 shrink-0">
                T2
              </Badge>
            )}
          </div>
          <p className="text-xs text-text-muted">
            {isNonCatalog ? (nonCatalogCategory || "Non-catalog") : (sku || "No SKU")}
          </p>
        </div>

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
                value={qtyNeeded}
                onChange={(e) => onQtyChange?.(parseFloat(e.target.value) || 0)}
                className="h-8 w-16 text-center text-sm"
                min={0}
                step="any"
              />
            </div>

            {/* Pieces display */}
            {piecesNeeded !== null && (
              <div className="w-16">
                <label className="text-[10px] text-text-muted font-medium uppercase tracking-wide block text-center h-6 leading-6">
                  {pieceUnit || "pieces"}
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
                    {pieceUnit || "pieces"}
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
