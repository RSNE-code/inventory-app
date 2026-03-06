"use client"

import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"

interface ReceiptLineRowProps {
  productName: string
  unitOfMeasure: string
  quantity: number
  unitCost: number
  onQuantityChange: (qty: number) => void
  onCostChange: (cost: number) => void
  onRemove: () => void
}

export function ReceiptLineRow({
  productName,
  unitOfMeasure,
  quantity,
  unitCost,
  onQuantityChange,
  onCostChange,
  onRemove,
}: ReceiptLineRowProps) {
  return (
    <div className="py-3 border-b border-border-custom last:border-0">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0">
          <p className="text-sm font-medium text-navy truncate">{productName}</p>
          <p className="text-xs text-text-muted">{unitOfMeasure}</p>
        </div>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={onRemove}
          className="h-8 w-8 text-status-red hover:text-status-red hover:bg-red-50 shrink-0"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="text-xs text-text-muted mb-1 block">Qty Received</label>
          <Input
            type="number"
            value={quantity || ""}
            onChange={(e) => onQuantityChange(parseFloat(e.target.value) || 0)}
            className="h-10"
            min={0}
            step="any"
          />
        </div>
        <div className="flex-1">
          <label className="text-xs text-text-muted mb-1 block">Unit Cost ($)</label>
          <Input
            type="number"
            value={unitCost || ""}
            onChange={(e) => onCostChange(parseFloat(e.target.value) || 0)}
            className="h-10"
            min={0}
            step="0.01"
          />
        </div>
      </div>
    </div>
  )
}
