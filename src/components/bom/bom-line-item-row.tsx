"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Trash2 } from "lucide-react"
import { formatQuantity } from "@/lib/utils"

interface BomLineItemRowProps {
  name: string
  sku?: string | null
  unitOfMeasure: string
  dimLength?: number | null
  pieceUnit?: string | null
  tier: string
  qtyNeeded: number
  isNonCatalog?: boolean
  nonCatalogCategory?: string | null
  qtyCheckedOut?: number
  qtyReturned?: number
  editable?: boolean
  onQtyChange?: (qty: number) => void
  onRemove?: () => void
}

export function BomLineItemRow({
  name,
  sku,
  unitOfMeasure,
  dimLength,
  pieceUnit,
  tier,
  qtyNeeded,
  isNonCatalog,
  nonCatalogCategory,
  qtyCheckedOut = 0,
  qtyReturned = 0,
  editable = false,
  onQtyChange,
  onRemove,
}: BomLineItemRowProps) {
  const hasPieceConversion = dimLength && dimLength > 0
  const piecesNeeded = hasPieceConversion ? Math.ceil(qtyNeeded / dimLength) : null

  return (
    <div className="py-3 border-b border-border-custom last:border-0">
      {/* Top row: name + tier badge */}
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
          /* --- EDIT MODE: small inputs right-aligned --- */
          <div className="flex items-end gap-1.5 shrink-0">
            <div className="w-16">
              <label className="text-[10px] text-text-muted font-medium uppercase tracking-wide block text-center">
                {unitOfMeasure}
              </label>
              <Input
                type="number"
                value={qtyNeeded}
                onChange={(e) => onQtyChange?.(parseFloat(e.target.value) || 0)}
                className="h-8 text-center text-sm mt-0.5"
                min={0}
                step="any"
              />
            </div>

            {hasPieceConversion && (
              <div className="w-16">
                <label className="text-[10px] text-text-muted font-medium uppercase tracking-wide block text-center">
                  pieces
                </label>
                <div className="h-8 mt-0.5 rounded-md border border-border-custom bg-surface-secondary flex items-center justify-center">
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
          /* --- READ-ONLY MODE (shop foreman view): right-aligned --- */
          <div className="text-right shrink-0">
            {hasPieceConversion ? (
              <>
                <div>
                  <span className="text-lg font-bold text-navy tabular-nums">
                    {piecesNeeded}
                  </span>
                  <span className="text-sm font-medium text-navy ml-1">
                    pieces
                  </span>
                </div>
                <span className="text-xs text-text-muted tabular-nums">
                  ({formatQuantity(qtyNeeded)} {unitOfMeasure})
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

      {/* Checkout progress (for in-progress BOMs) */}
      {qtyCheckedOut > 0 && (
        <p className="text-xs text-text-muted mt-1">
          Checked out: {formatQuantity(qtyCheckedOut)}
          {qtyReturned > 0 && ` · Returned: ${formatQuantity(qtyReturned)}`}
        </p>
      )}
    </div>
  )
}
