"use client"

import { useState } from "react"
import {
  PackageCheck,
  Minus,
  Plus,
  AlertTriangle,
  FileText,
  Briefcase,
  ArrowLeft,
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
    <div className="space-y-4 animate-fade-in-up">
      {/* PO Header */}
      <Card className="rounded-xl border-border-custom shadow-brand-md overflow-hidden">
        <div className="bg-navy px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
                <FileText className="h-5 w-5 text-white/80" />
              </div>
              <div>
                <p className="text-lg font-extrabold text-white tabular-nums tracking-tight">
                  PO #{po.poNumber}
                </p>
                <p className="text-xs text-white/60 font-medium">
                  {po.supplierName}
                </p>
              </div>
            </div>
          </div>

          {/* Job name */}
          {po.jobName && (
            <div className="flex items-center gap-2 mt-2.5 pl-[52px]">
              <Briefcase className="h-3.5 w-3.5 text-brand-blue-bright" />
              <span className="text-sm font-semibold text-white/90">{po.jobName}</span>
            </div>
          )}
        </div>

        {/* Column header */}
        <div className="flex items-center px-4 py-2.5 bg-surface-secondary border-b border-border-custom text-[10px] font-bold text-text-muted uppercase tracking-[0.08em]">
          <span className="flex-1">Item</span>
          <span className="w-14 text-center">Ordered</span>
          <span className="w-28 text-center">Receiving</span>
        </div>

        {/* Line items */}
        <div className="divide-y divide-border-custom/30">
          {po.lineItems.map((li, index) => (
            <ReceiveLineRow
              key={li.id}
              lineItem={li}
              qtyToReceive={quantities[index]}
              onQtyChange={(qty) => updateQty(index, qty)}
              index={index}
            />
          ))}
        </div>

        {/* Total footer */}
        <div className="flex items-center justify-between px-4 py-3.5 bg-navy/[0.03] border-t border-border-custom">
          <span className="text-sm font-bold text-text-secondary uppercase tracking-wide">
            Receipt Total
          </span>
          <span className="text-lg font-extrabold text-navy tabular-nums">
            {formatCurrency(totalCost)}
          </span>
        </div>
      </Card>

      {/* Confirm button */}
      <Button
        onClick={handleConfirm}
        disabled={itemsToReceive.length === 0}
        className="w-full h-14 bg-brand-orange hover:bg-brand-orange-hover text-white font-bold text-base rounded-xl shadow-[0_3px_12px_rgba(232,121,43,0.3)] hover:shadow-[0_4px_16px_rgba(232,121,43,0.4)] disabled:shadow-none transition-all active:scale-[0.98]"
      >
        <PackageCheck className="h-5 w-5 mr-2" />
        Confirm Receipt ({itemsToReceive.length} item{itemsToReceive.length !== 1 ? "s" : ""})
      </Button>

      {/* Back */}
      <button
        onClick={onBack}
        className="w-full flex items-center justify-center gap-1.5 text-sm text-text-muted hover:text-navy font-medium py-2 transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
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
  index,
}: {
  lineItem: POLineItemData
  qtyToReceive: number
  onQtyChange: (qty: number) => void
  index: number
}) {
  const remaining = Math.max(0, lineItem.qtyOrdered - lineItem.qtyReceived)
  const isFullyReceived = remaining === 0
  const isReceivingFull = qtyToReceive === remaining && remaining > 0
  const isReceivingPartial = qtyToReceive > 0 && qtyToReceive < remaining
  const isReceivingNone = qtyToReceive === 0 && !isFullyReceived

  return (
    <div
      className={cn(
        "flex items-center px-4 py-3.5 gap-3 transition-all duration-200 animate-fade-in",
        // Color-coded left border for instant visual feedback
        isReceivingFull && "border-l-[3px] border-l-status-green bg-green-50/30",
        isReceivingPartial && "border-l-[3px] border-l-brand-orange bg-orange-50/20",
        isReceivingNone && "border-l-[3px] border-l-transparent opacity-40",
        isFullyReceived && "border-l-[3px] border-l-transparent opacity-30 bg-surface-secondary/30",
        // Items that aren't color-coded get default border
        !isReceivingFull && !isReceivingPartial && !isReceivingNone && !isFullyReceived && "border-l-[3px] border-l-transparent"
      )}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Item name + status */}
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-bold text-navy leading-tight truncate">
          {lineItem.productName || lineItem.description}
        </p>
        <div className="flex items-center gap-2 mt-1">
          {lineItem.qtyReceived > 0 && (
            <span
              className={cn(
                "text-[10px] font-bold px-2 py-0.5 rounded-full",
                isFullyReceived
                  ? "text-status-green bg-green-50"
                  : "text-brand-orange bg-orange-50"
              )}
            >
              {isFullyReceived ? "COMPLETE" : `${lineItem.qtyReceived} prev. received`}
            </span>
          )}
          {lineItem.unitCost > 0 && (
            <span className="text-[10px] text-text-muted tabular-nums font-medium">
              @ {formatCurrency(lineItem.unitCost)}
            </span>
          )}
        </div>
      </div>

      {/* Qty ordered */}
      <div className="w-14 text-center">
        <span className="text-sm font-extrabold text-navy tabular-nums">
          {lineItem.qtyOrdered}
        </span>
      </div>

      {/* Qty to receive — always visible, large touch targets */}
      <div className="w-28">
        {isFullyReceived ? (
          <div className="text-center text-xs text-text-muted font-semibold py-2">
            — done
          </div>
        ) : (
          <div
            className={cn(
              "flex items-center rounded-xl border-2 transition-colors",
              isReceivingFull
                ? "border-status-green/40 bg-green-50/50"
                : isReceivingPartial
                  ? "border-brand-orange/30 bg-orange-50/30"
                  : "border-border-custom bg-white"
            )}
          >
            <button
              onClick={() => onQtyChange(qtyToReceive - 1)}
              disabled={qtyToReceive <= 0}
              className="h-11 w-11 flex items-center justify-center text-text-muted hover:text-navy hover:bg-surface-secondary/80 disabled:opacity-20 transition-colors rounded-l-[10px] active:scale-90"
            >
              <Minus className="h-4 w-4" />
            </button>
            <input
              type="number"
              min={0}
              value={qtyToReceive}
              onChange={(e) => onQtyChange(Number(e.target.value) || 0)}
              className={cn(
                "w-full text-center text-base font-extrabold bg-transparent border-0 focus:outline-none focus:ring-0 tabular-nums",
                "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
                isReceivingFull ? "text-status-green" : isReceivingPartial ? "text-brand-orange" : "text-navy"
              )}
            />
            <button
              onClick={() => onQtyChange(qtyToReceive + 1)}
              className="h-11 w-11 flex items-center justify-center text-text-muted hover:text-navy hover:bg-surface-secondary/80 transition-colors rounded-r-[10px] active:scale-90"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Over-receiving warning */}
        {qtyToReceive > remaining && !isFullyReceived && (
          <div className="flex items-center justify-center gap-1 mt-1.5 text-brand-orange animate-fade-in">
            <AlertTriangle className="h-3 w-3" />
            <span className="text-[10px] font-bold">Over qty</span>
          </div>
        )}
      </div>
    </div>
  )
}
