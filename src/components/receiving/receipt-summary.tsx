"use client"

import { PackageCheck, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { formatCurrency } from "@/lib/utils"
import type { ConfirmedReceivingItem } from "@/lib/ai/types"

interface ReceiptSummaryProps {
  supplier: { id: string; name: string }
  items: ConfirmedReceivingItem[]
  notes: string
  onNotesChange: (notes: string) => void
  onConfirm: () => void
  onBack: () => void
  isSubmitting: boolean
}

export function ReceiptSummary({
  supplier,
  items,
  notes,
  onNotesChange,
  onConfirm,
  onBack,
  isSubmitting,
}: ReceiptSummaryProps) {
  const catalogItems = items.filter((i) => !i.isNonCatalog)
  const nonCatalogItems = items.filter((i) => i.isNonCatalog)
  const totalCost = items.reduce((sum, i) => sum + i.quantity * i.unitCost, 0)

  return (
    <div className="space-y-4">
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-blue-600 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to review
      </button>

      <Card className="p-4 rounded-xl border-border-custom">
        <h3 className="font-semibold text-navy mb-3">Receipt Summary</h3>

        {/* Supplier */}
        <div className="flex items-center justify-between py-2 border-b border-gray-100">
          <span className="text-sm text-gray-500">Supplier</span>
          <span className="text-sm font-medium text-gray-900">{supplier.name}</span>
        </div>

        {/* Items */}
        <div className="mt-3 space-y-2">
          {catalogItems.map((item, i) => (
            <div
              key={`${item.productId}-${i}`}
              className="flex items-center justify-between py-2 border-b border-gray-50"
            >
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {item.productName}
                </p>
                <p className="text-xs text-gray-500">
                  {item.quantity} {item.unitOfMeasure} @ {formatCurrency(item.unitCost)}
                </p>
              </div>
              <span className="text-sm font-medium text-gray-700 ml-3">
                {formatCurrency(item.quantity * item.unitCost)}
              </span>
            </div>
          ))}

          {nonCatalogItems.length > 0 && (
            <>
              <p className="text-xs text-gray-400 pt-2">Non-catalog items (logged only)</p>
              {nonCatalogItems.map((item, i) => (
                <div
                  key={`nc-${i}`}
                  className="flex items-center justify-between py-2 border-b border-gray-50 opacity-60"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700 truncate">{item.productName}</p>
                    <p className="text-xs text-gray-400">
                      {item.quantity} {item.unitOfMeasure}
                    </p>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Total */}
        <div className="flex items-center justify-between pt-3 mt-2 border-t border-gray-200">
          <span className="text-sm font-semibold text-gray-700">Total</span>
          <span className="text-lg font-semibold text-navy">{formatCurrency(totalCost)}</span>
        </div>
      </Card>

      {/* Notes */}
      <Card className="p-4 rounded-xl border-border-custom space-y-2">
        <label className="text-sm font-medium text-navy">Notes</label>
        <textarea
          value={notes}
          onChange={(e) => onNotesChange(e.target.value)}
          placeholder="Optional delivery notes..."
          className="w-full rounded-lg border border-border-custom p-3 text-sm min-h-[60px] resize-none focus:outline-none focus:ring-2 focus:ring-brand-blue"
        />
      </Card>

      {/* Confirm */}
      <Button
        onClick={onConfirm}
        disabled={isSubmitting || catalogItems.length === 0}
        className="w-full h-14 bg-brand-orange hover:bg-brand-orange-hover text-white font-semibold text-base rounded-xl"
      >
        <PackageCheck className="h-5 w-5 mr-2" />
        {isSubmitting
          ? "Processing..."
          : `Confirm Receipt (${catalogItems.length} item${catalogItems.length !== 1 ? "s" : ""})`}
      </Button>
    </div>
  )
}
