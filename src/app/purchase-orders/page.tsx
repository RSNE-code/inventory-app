"use client"

import Link from "next/link"
import { Header } from "@/components/layout/header"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { usePurchaseOrders } from "@/hooks/use-purchase-orders"
import { formatCurrency } from "@/lib/utils"
import { Plus, FileText, Package } from "lucide-react"

const statusColors: Record<string, string> = {
  OPEN: "bg-brand-blue/10 text-brand-blue",
  PARTIALLY_RECEIVED: "bg-brand-orange/10 text-brand-orange",
  RECEIVED: "bg-status-green/10 text-status-green",
  CLOSED: "bg-text-muted/10 text-text-muted",
}

const statusLabels: Record<string, string> = {
  OPEN: "Open",
  PARTIALLY_RECEIVED: "Partial",
  RECEIVED: "Received",
  CLOSED: "Closed",
}

export default function PurchaseOrdersPage() {
  const { data, isLoading } = usePurchaseOrders()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const purchaseOrders = (data?.data || []) as any[]

  return (
    <div>
      <Header title="Purchase Orders" showBack />

      <div className="p-4 space-y-4">
        <Link href="/purchase-orders/new">
          <Button className="w-full h-12 bg-brand-blue hover:bg-brand-blue/90 text-white font-semibold rounded-xl">
            <Plus className="h-5 w-5 mr-2" />
            New Purchase Order
          </Button>
        </Link>

        {isLoading && (
          <div className="text-center py-8 text-text-muted text-sm">Loading...</div>
        )}

        {!isLoading && purchaseOrders.length === 0 && (
          <div className="text-center py-8 text-text-muted">
            <FileText className="h-12 w-12 mx-auto mb-3 text-text-muted/50" />
            <p className="text-sm">No purchase orders yet</p>
          </div>
        )}

        {purchaseOrders.map(
          (po: {
            id: string
            poNumber: string
            status: string
            createdAt: string
            supplier: { name: string }
            lineItems: { qtyOrdered: string; qtyReceived: string; unitCost: string }[]
          }) => {
            const totalValue = po.lineItems.reduce(
              (sum: number, li: { qtyOrdered: string; unitCost: string }) =>
                sum + Number(li.qtyOrdered) * Number(li.unitCost),
              0
            )
            const totalRemaining = po.lineItems.reduce(
              (sum: number, li: { qtyOrdered: string; qtyReceived: string }) =>
                sum + Math.max(0, Number(li.qtyOrdered) - Number(li.qtyReceived)),
              0
            )

            return (
              <Link key={po.id} href={`/purchase-orders/${po.id}`}>
                <Card className="p-4 rounded-xl border-border-custom hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <FileText className="h-4 w-4 text-brand-blue shrink-0" />
                        <p className="text-sm font-semibold text-navy">PO #{po.poNumber}</p>
                        <span
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[po.status] || ""}`}
                        >
                          {statusLabels[po.status] || po.status}
                        </span>
                      </div>
                      <p className="text-xs text-text-muted">{po.supplier.name}</p>
                      <div className="flex items-center gap-3 mt-2 text-xs text-text-muted">
                        <span className="flex items-center gap-1">
                          <Package className="h-3 w-3" />
                          {po.lineItems.length} items
                        </span>
                        <span>{formatCurrency(totalValue)}</span>
                        {totalRemaining > 0 && (
                          <span className="text-brand-orange">{totalRemaining} remaining</span>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            )
          }
        )}
      </div>
    </div>
  )
}
