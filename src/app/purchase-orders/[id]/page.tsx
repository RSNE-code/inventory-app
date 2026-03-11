"use client"

import { use } from "react"
import Link from "next/link"
import { Header } from "@/components/layout/header"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { usePurchaseOrder } from "@/hooks/use-purchase-orders"
import { formatCurrency } from "@/lib/utils"
import { PackageCheck, FileText } from "lucide-react"

const statusColors: Record<string, string> = {
  OPEN: "bg-brand-blue/10 text-brand-blue",
  PARTIALLY_RECEIVED: "bg-brand-orange/10 text-brand-orange",
  RECEIVED: "bg-status-green/10 text-status-green",
  CLOSED: "bg-text-muted/10 text-text-muted",
}

const statusLabels: Record<string, string> = {
  OPEN: "Open",
  PARTIALLY_RECEIVED: "Partially Received",
  RECEIVED: "Fully Received",
  CLOSED: "Closed",
}

export default function PurchaseOrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const { data, isLoading } = usePurchaseOrder(id)
  const po = data?.data

  if (isLoading) {
    return (
      <div>
        <Header title="Purchase Order" showBack />
        <div className="text-center py-8 text-text-muted text-sm">Loading...</div>
      </div>
    )
  }

  if (!po) {
    return (
      <div>
        <Header title="Purchase Order" showBack />
        <div className="text-center py-8 text-text-muted text-sm">PO not found</div>
      </div>
    )
  }

  const canReceive = po.status === "OPEN" || po.status === "PARTIALLY_RECEIVED"

  return (
    <div>
      <Header title={`PO #${po.poNumber}`} showBack />

      <div className="p-4 space-y-4">
        {/* Header info */}
        <Card className="p-4 rounded-xl border-border-custom space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-text-muted">Supplier</p>
              <p className="text-sm font-medium text-navy">{po.supplier.name}</p>
            </div>
            <span
              className={`text-xs px-3 py-1 rounded-full font-medium ${statusColors[po.status] || ""}`}
            >
              {statusLabels[po.status] || po.status}
            </span>
          </div>
          {po.expectedDelivery && (
            <div>
              <p className="text-xs text-text-muted">Expected Delivery</p>
              <p className="text-sm text-navy">
                {new Date(po.expectedDelivery).toLocaleDateString()}
              </p>
            </div>
          )}
          {po.notes && (
            <div>
              <p className="text-xs text-text-muted">Notes</p>
              <p className="text-sm text-text-secondary">{po.notes}</p>
            </div>
          )}
        </Card>

        {/* Line Items */}
        <Card className="p-4 rounded-xl border-border-custom space-y-3">
          <h3 className="font-semibold text-navy">Line Items ({po.lineItems.length})</h3>

          {po.lineItems.map(
            (li: {
              id: string
              qtyOrdered: string
              qtyReceived: string
              unitCost: string
              product: { name: string; unitOfMeasure: string }
            }) => {
              const ordered = Number(li.qtyOrdered)
              const received = Number(li.qtyReceived)
              const remaining = Math.max(0, ordered - received)
              const pct = ordered > 0 ? Math.min(100, (received / ordered) * 100) : 0

              return (
                <div
                  key={li.id}
                  className="py-3 border-b border-border-custom last:border-0"
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-navy">{li.product.name}</p>
                      <p className="text-xs text-text-muted">{li.product.unitOfMeasure}</p>
                    </div>
                    <p className="text-sm font-medium text-navy shrink-0">
                      {formatCurrency(ordered * Number(li.unitCost))}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-text-muted">
                    <span>Ordered: {ordered}</span>
                    <span>Received: {received}</span>
                    {remaining > 0 && (
                      <span className="text-brand-orange">Remaining: {remaining}</span>
                    )}
                    <span>@ {formatCurrency(Number(li.unitCost))}/ea</span>
                  </div>
                  {/* Progress bar */}
                  <div className="mt-2 h-1.5 bg-border-custom rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        pct >= 100 ? "bg-status-green" : "bg-brand-blue"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              )
            }
          )}
        </Card>

        {/* Receive button */}
        {canReceive && (
          <Link href="/receiving">
            <Button className="w-full h-14 bg-brand-orange hover:bg-brand-orange-hover text-white font-semibold text-base rounded-xl">
              <PackageCheck className="h-5 w-5 mr-2" />
              Receive Against This PO
            </Button>
          </Link>
        )}

        {/* Receipt history */}
        {po.receipts && po.receipts.length > 0 && (
          <Card className="p-4 rounded-xl border-border-custom space-y-3">
            <h3 className="font-semibold text-navy">Receipt History</h3>
            {po.receipts.map(
              (r: {
                id: string
                receivedAt: string
                transactions: { id: string; quantity: string; product: { name: string } }[]
              }) => (
                <div
                  key={r.id}
                  className="py-2 border-b border-border-custom last:border-0"
                >
                  <p className="text-xs text-text-muted">
                    {new Date(r.receivedAt).toLocaleDateString()} at{" "}
                    {new Date(r.receivedAt).toLocaleTimeString()}
                  </p>
                  {r.transactions.map(
                    (t: { id: string; quantity: string; product: { name: string } }) => (
                      <p key={t.id} className="text-sm text-text-secondary">
                        {t.product.name}: {Number(t.quantity)}
                      </p>
                    )
                  )}
                </div>
              )
            )}
          </Card>
        )}
      </div>
    </div>
  )
}
