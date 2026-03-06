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
  const piecesNeeded = pieceSize && pieceSize > 0 ? Math.ceil(qtyNeeded / pieceSize) : null
  return (
    <div className="flex items-center gap-3 py-3 border-b border-border-custom last:border-0">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-navy truncate">{name}</p>
          {tier === "TIER_2" && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 bg-purple-50 text-purple-700 border-purple-200">
              T2
            </Badge>
          )}
        </div>
        <p className="text-xs text-text-muted">
          {isNonCatalog ? (nonCatalogCategory || "Non-catalog") : (sku || "No SKU")}
          <span className="mx-1">&middot;</span>
          {unitOfMeasure}
        </p>
        {qtyCheckedOut > 0 && (
          <p className="text-xs text-text-muted mt-0.5">
            Checked out: {formatQuantity(qtyCheckedOut)}
            {qtyReturned > 0 && ` · Returned: ${formatQuantity(qtyReturned)}`}
          </p>
        )}
      </div>

      {editable ? (
        <div className="flex items-center gap-2">
          <div>
            <Input
              type="number"
              value={qtyNeeded}
              onChange={(e) => onQtyChange?.(parseFloat(e.target.value) || 0)}
              className="w-20 h-10 text-center"
              min={0}
              step="any"
            />
            {piecesNeeded !== null && (
              <p className="text-[11px] text-brand-blue font-medium text-center mt-0.5">
                = {piecesNeeded} {pieceUnit || "pcs"}
              </p>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onRemove}
            className="h-10 w-10 text-status-red hover:text-status-red hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <div className="text-right whitespace-nowrap">
          <span className="text-sm font-semibold text-navy tabular-nums">
            {formatQuantity(qtyNeeded)} {unitOfMeasure}
          </span>
          {piecesNeeded !== null && (
            <p className="text-xs text-brand-blue font-medium">
              {piecesNeeded} {pieceUnit || "pcs"}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
