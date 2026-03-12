"use client"

import { useState } from "react"
import {
  PackageCheck,
  Minus,
  Plus,
  AlertTriangle,
  FileText,
  Briefcase,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { cn, formatCurrency } from "@/lib/utils"
import type { MatchedPO, POLineItemData, ConfirmedReceivingItem } from "@/lib/ai/types"

interface POReceiveCardProps {
  po: MatchedPO
  onConfirm: (items: ConfirmedReceivingItem[]) => void
  onBack: () => void
}

export function POReceiveCard({ po, onConfirm, onBack }: POReceiveCardProps) {
  // Every item gets an editable qty, pre-filled with remaining (ordered - already received)
  const [quantities, setQuantities] = useState<number[]>(() =>
    po.lineItems.map((li) => Math.max(0, li.qtyOrdered - li.qtyReceived))
  )

  function updateQty(index: number, qty: number) {
    setQuantities((prev) => prev.map((q, i) => (i === index ? Math.max(0, qty) : q)))
  }

  const itemsToReceive = po.lineItems.filter((_, i) => quantities[i] > 0)
  const totalCost = po.lineItems.reduce(
    (sum, li, i) => sum + quantities[i] * li.unitCost,
    0
  )

  function handleConfirm() {
    const items: ConfirmedReceivingItem[] = po.lineItems
      .map((li, i) => ({
        productId: li.productId,
        productName: li.productName || li.description,
        quantity: quantities[i],
        unitCost: li.unitCost,
        unitOfMeasure: "each",
        isNonCatalog: !li.productId,
        poLineItemId: li.id,
      }))
      .filter((item) => item.quantity > 0)

    onConfirm(items)
  }

  return (
    <div className="space-y-4 animate-fade-in">
      {/* PO Header */}
      <Card className="rounded-xl border-border-custom overflow-hidden">
        <div className="bg-navy/[0.03] px-4 py-3 border-b border-border-custom/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-blue/8">
                <FileText className="h-5 w-5 text-brand-blue" />
              </div>
              <div>
                <p className="text-lg font-extrabold text-navy tabular-nums tracking-tight">
                  PO #{po.poNumber}
                </p>
                <p className="text-xs text-text-muted font-medium">
                  {po.supplierName}
                </p>
              </div>
            </div>
          </div>

          {/* Job name */}
          {po.jobName && (
            <div className="flex items-center gap-2 mt-2 pl-[52px]">
              <Briefcase className="h-3.5 w-3.5 text-brand-blue" />
              <span className="text-sm font-semibold text-navy">{po.jobName}</span>
            </div>
          )}
        </div>

        {/* Column header */}
        <div className="flex items-center px-4 py-2 bg-surface-secondary/50 border-b border-border-custom/40 text-[10px] font-semibold text-text-muted uppercase tracking-wider">
          <span className="flex-1">Item</span>
          <span className="w-16 text-center">Ordered</span>
          <span className="w-24 text-center">Receiving</span>
        </div>

        {/* Line items — always show qty input */}
        <div className="divide-y divide-border-custom/30">
          {po.lineItems.map((li, index) => (
            <ReceiveLineRow
              key={li.id}
              lineItem={li}
              qtyToReceive={quantities[index]}
              onQtyChange={(qty) => updateQty(index, qty)}
            />
          ))}
        </div>

        {/* Total footer */}
        <div className="flex items-center justify-between px-4 py-3 bg-surface-secondary/30 border-t border-border-custom/60">
          <span className="text-sm font-semibold text-text-secondary">
            Receipt Total
          </span>
          <span className="text-base font-bold text-navy tabular-nums">
            {formatCurrency(totalCost)}
          </span>
        </div>
      </Card>

      {/* Confirm button */}
      <Button
        onClick={handleConfirm}
        disabled={itemsToReceive.length === 0}
        className="w-full h-14 bg-brand-orange hover:bg-brand-orange-hover text-white font-semibold text-base rounded-xl shadow-[0_2px_8px_rgba(232,121,43,0.25)] disabled:shadow-none"
      >
        <PackageCheck className="h-5 w-5 mr-2" />
        Confirm Receipt ({itemsToReceive.length} item{itemsToReceive.length !== 1 ? "s" : ""})
      </Button>

      {/* Back */}
      <button
        onClick={onBack}
        className="w-full text-center text-sm text-gray-400 hover:text-gray-600 py-2"
      >
        Back to PO selection
      </button>
    </div>
  )
}

// ─── Individual Line Item Row ───

function ReceiveLineRow({
  lineItem,
  qtyToReceive,
  onQtyChange,
}: {
  lineItem: POLineItemData
  qtyToReceive: number
  onQtyChange: (qty: number) => void
}) {
  const remaining = Math.max(0, lineItem.qtyOrdered - lineItem.qtyReceived)
  const isFullyReceived = remaining === 0

  return (
    <div
      className={cn(
        "flex items-center px-4 py-3 gap-3",
        isFullyReceived && "opacity-40 bg-gray-50/50",
        qtyToReceive === 0 && !isFullyReceived && "opacity-60"
      )}
    >
      {/* Item name + status */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-navy leading-tight truncate">
          {lineItem.productName || lineItem.description}
        </p>
        <div className="flex items-center gap-2 mt-1">
          {lineItem.qtyReceived > 0 && (
            <span
              className={cn(
                "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                isFullyReceived
                  ? "text-status-green bg-green-50"
                  : "text-brand-orange bg-orange-50"
              )}
            >
              {isFullyReceived ? "COMPLETE" : `${lineItem.qtyReceived} received`}
            </span>
          )}
          {lineItem.unitCost > 0 && (
            <span className="text-[11px] text-text-muted tabular-nums">
              @ {formatCurrency(lineItem.unitCost)}
            </span>
          )}
        </div>
      </div>

      {/* Qty ordered */}
      <div className="w-16 text-center">
        <span className="text-sm font-bold text-navy tabular-nums">
          {lineItem.qtyOrdered}
        </span>
      </div>

      {/* Qty to receive — always visible */}
      <div className="w-24">
        {isFullyReceived ? (
          <div className="text-center text-xs text-text-muted font-medium">—</div>
        ) : (
          <div className="flex items-center bg-white rounded-lg border border-border-custom/80 shadow-sm">
            <button
              onClick={() => onQtyChange(qtyToReceive - 1)}
              disabled={qtyToReceive <= 0}
              className="h-9 w-8 flex items-center justify-center text-text-muted hover:text-navy disabled:opacity-20 transition-colors rounded-l-lg hover:bg-surface-secondary/60"
            >
              <Minus className="h-3 w-3" />
            </button>
            <input
              type="number"
              min={0}
              value={qtyToReceive}
              onChange={(e) => onQtyChange(Number(e.target.value) || 0)}
              className="w-10 text-center text-sm font-bold text-navy bg-transparent border-0 focus:outline-none focus:ring-0 tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <button
              onClick={() => onQtyChange(qtyToReceive + 1)}
              className="h-9 w-8 flex items-center justify-center text-text-muted hover:text-navy transition-colors rounded-r-lg hover:bg-surface-secondary/60"
            >
              <Plus className="h-3 w-3" />
            </button>
          </div>
        )}

        {/* Over-receiving warning */}
        {qtyToReceive > remaining && !isFullyReceived && (
          <div className="flex items-center justify-center gap-1 mt-1 text-brand-orange">
            <AlertTriangle className="h-2.5 w-2.5" />
            <span className="text-[9px] font-medium">Over qty</span>
          </div>
        )}
      </div>
    </div>
  )
}
