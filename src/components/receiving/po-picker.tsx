"use client"

import { usePurchaseOrders } from "@/hooks/use-purchase-orders"
import { Card } from "@/components/ui/card"
import { FileText, ChevronRight, Package } from "lucide-react"
import { formatCurrency } from "@/lib/utils"

interface POLineItem {
  id: string
  productId: string
  qtyOrdered: number
  qtyReceived: number
  unitCost: number
  product: { id: string; name: string; unitOfMeasure: string }
}

export interface PurchaseOrderOption {
  id: string
  poNumber: string
  status: string
  expectedDelivery: string | null
  notes: string | null
  lineItems: POLineItem[]
}

interface POPickerProps {
  supplierId: string
  onSelect: (po: PurchaseOrderOption) => void
  onSkip: () => void
  selectedPoNumber?: string
}

export function POPicker({ supplierId, onSelect, onSkip, selectedPoNumber }: POPickerProps) {
  const { data, isLoading } = usePurchaseOrders({
    supplierId,
    openOnly: true,
  })

  const purchaseOrders: PurchaseOrderOption[] = (data?.data || []).map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (po: any) => ({
      ...po,
      lineItems: po.lineItems.map(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (li: any) => ({
          ...li,
          qtyOrdered: Number(li.qtyOrdered),
          qtyReceived: Number(li.qtyReceived),
          unitCost: Number(li.unitCost),
        })
      ),
    })
  )

  if (isLoading) {
    return (
      <div className="text-center py-4 text-text-muted text-sm">
        Checking for open POs...
      </div>
    )
  }

  if (purchaseOrders.length === 0) {
    return null
  }

  if (selectedPoNumber) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-xl bg-surface-secondary border border-border-custom">
        <FileText className="h-5 w-5 text-brand-blue" />
        <div className="flex-1">
          <p className="text-sm font-medium text-navy">PO #{selectedPoNumber}</p>
        </div>
        <button
          type="button"
          onClick={onSkip}
          className="text-xs text-brand-blue hover:underline"
        >
          Remove
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-text-secondary font-medium">
        Open POs for this supplier ({purchaseOrders.length})
      </p>

      {purchaseOrders.map((po) => {
        const remaining = po.lineItems.reduce(
          (sum, li) => sum + Math.max(0, li.qtyOrdered - li.qtyReceived),
          0
        )
        const totalValue = po.lineItems.reduce(
          (sum, li) => sum + Math.max(0, li.qtyOrdered - li.qtyReceived) * li.unitCost,
          0
        )

        return (
          <button
            key={po.id}
            type="button"
            onClick={() => onSelect(po)}
            className="w-full text-left"
          >
            <Card className="p-3 rounded-xl border-border-custom hover:border-brand-blue hover:shadow-sm transition-all">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="h-5 w-5 text-brand-blue shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-navy">PO #{po.poNumber}</p>
                    <div className="flex items-center gap-2 text-xs text-text-muted">
                      <span className="flex items-center gap-1">
                        <Package className="h-3 w-3" />
                        {po.lineItems.length} items
                      </span>
                      <span>·</span>
                      <span>{remaining} remaining</span>
                      <span>·</span>
                      <span>{formatCurrency(totalValue)}</span>
                    </div>
                    {po.status === "PARTIALLY_RECEIVED" && (
                      <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded-full bg-brand-orange/10 text-brand-orange font-medium">
                        Partially received
                      </span>
                    )}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-text-muted shrink-0" />
              </div>
            </Card>
          </button>
        )
      })}

      <button
        type="button"
        onClick={onSkip}
        className="w-full text-center text-sm text-text-muted hover:text-text-secondary py-2"
      >
        Receive without a PO
      </button>
    </div>
  )
}
