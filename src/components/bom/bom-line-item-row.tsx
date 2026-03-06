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
  pieceSize?: number | null
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
  pieceSize,
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
  const hasPieceConversion = pieceSize && pieceSize > 0
  const piecesNeeded = hasPieceConversion ? Math.ceil(qtyNeeded / pieceSize) : null

  return (
    <div className="py-3 border-b border-border-custom last:border-0">
      {/* Top row: name + tier badge */}
      <div className="flex items-center gap-2 mb-1">
        <p className="text-sm font-medium text-navy truncate flex-1">{name}</p>
        {tier === "TIER_2" && (
          <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-purple-50 text-purple-700 border-purple-200 shrink-0">
            T2
          </Badge>
        )}
      </div>

      {/* SKU / category line */}
      <p className="text-xs text-text-muted mb-2">
        {isNonCatalog ? (nonCatalogCategory || "Non-catalog") : (sku || "No SKU")}
      </p>

      {editable ? (
        /* --- EDIT MODE --- */
        <div className="flex items-end gap-2">
          {/* Quoted units input */}
          <div className="flex-1">
            <label className="text-[11px] text-text-muted font-medium uppercase tracking-wide">
              {unitOfMeasure}
            </label>
            <Input
              type="number"
              value={qtyNeeded}
              onChange={(e) => onQtyChange?.(parseFloat(e.target.value) || 0)}
              className="h-10 text-center mt-0.5"
              min={0}
              step="any"
            />
          </div>

          {/* Auto-calculated pieces box */}
          {hasPieceConversion && (
            <div className="flex-1">
              <label className="text-[11px] text-text-muted font-medium uppercase tracking-wide">
                {pieceUnit || "pieces"}
              </label>
              <div className="h-10 mt-0.5 rounded-md border border-border-custom bg-surface-secondary flex items-center justify-center">
                <span className="text-sm font-semibold text-navy">{piecesNeeded}</span>
              </div>
            </div>
          )}

          {/* Remove button */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onRemove}
            className="h-10 w-10 shrink-0 text-status-red hover:text-status-red hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        /* --- READ-ONLY MODE (shop foreman view) --- */
        <div className="flex items-baseline justify-between">
          {hasPieceConversion ? (
            <>
              {/* Piece count is the big prominent number */}
              <div>
                <span className="text-lg font-bold text-navy tabular-nums">
                  {piecesNeeded}
                </span>
                <span className="text-sm font-medium text-navy ml-1">
                  {pieceUnit || "pcs"}
                </span>
              </div>
              {/* Original quoted units shown smaller */}
              <span className="text-xs text-text-muted tabular-nums">
                ({formatQuantity(qtyNeeded)} {unitOfMeasure})
              </span>
            </>
          ) : (
            /* No conversion — just show the quantity */
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
