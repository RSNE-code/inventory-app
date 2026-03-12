"use client"

import { useState } from "react"
import {
  PackageCheck,
  Check,
  Minus,
  Plus,
  AlertTriangle,
  FileText,
  Building2,
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

interface LineItemReceiveState {
  lineItem: POLineItemData
  qtyToReceive: number
  isChecked: boolean
}

export function POReceiveCard({ po, onConfirm, onBack }: POReceiveCardProps) {
  const [lineStates, setLineStates] = useState<LineItemReceiveState[]>(() =>
    po.lineItems.map((li) => ({
      lineItem: li,
      qtyToReceive: Math.max(0, li.qtyOrdered - li.qtyReceived),
      isChecked: li.qtyOrdered - li.qtyReceived > 0,
    }))
  )

  const checkedCount = lineStates.filter((s) => s.isChecked).length
  const totalItems = lineStates.length
  const allChecked = checkedCount === totalItems
  const totalCost = lineStates
    .filter((s) => s.isChecked)
    .reduce((sum, s) => sum + s.qtyToReceive * s.lineItem.unitCost, 0)

  function toggleItem(index: number) {
    setLineStates((prev) =>
      prev.map((s, i) =>
        i === index
          ? {
              ...s,
              isChecked: !s.isChecked,
              qtyToReceive: !s.isChecked
                ? Math.max(0, s.lineItem.qtyOrdered - s.lineItem.qtyReceived)
                : 0,
            }
          : s
      )
    )
  }

  function updateQty(index: number, qty: number) {
    setLineStates((prev) =>
      prev.map((s, i) =>
        i === index
          ? { ...s, qtyToReceive: Math.max(0, qty), isChecked: qty > 0 }
          : s
      )
    )
  }

  function toggleAll() {
    const shouldCheck = !allChecked
    setLineStates((prev) =>
      prev.map((s) => ({
        ...s,
        isChecked: shouldCheck,
        qtyToReceive: shouldCheck
          ? Math.max(0, s.lineItem.qtyOrdered - s.lineItem.qtyReceived)
          : 0,
      }))
    )
  }

  function handleConfirm() {
    const items: ConfirmedReceivingItem[] = lineStates
      .filter((s) => s.isChecked && s.qtyToReceive > 0)
      .map((s) => ({
        productId: s.lineItem.productId,
        productName: s.lineItem.productName || s.lineItem.description,
        quantity: s.qtyToReceive,
        unitCost: s.lineItem.unitCost,
        unitOfMeasure: "each",
        isNonCatalog: !s.lineItem.productId,
        poLineItemId: s.lineItem.id,
      }))

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
            {po.amount != null && (
              <span className="text-sm font-bold text-navy tabular-nums">
                {formatCurrency(po.amount)}
              </span>
            )}
          </div>

          {/* Meta row */}
          <div className="flex items-center gap-4 mt-2 pl-[52px]">
            {po.clientName && (
              <div className="flex items-center gap-1 text-[11px] text-text-muted">
                <Building2 className="h-3 w-3" />
                <span>{po.clientName}</span>
              </div>
            )}
            {po.jobName && (
              <div className="flex items-center gap-1 text-[11px] text-text-muted">
                <Briefcase className="h-3 w-3" />
                <span className="truncate max-w-[160px]">{po.jobName}</span>
              </div>
            )}
          </div>
        </div>

        {/* Select All header */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-surface-secondary/40 border-b border-border-custom/40">
          <button
            onClick={toggleAll}
            className="flex items-center gap-2 text-sm font-semibold text-navy hover:text-brand-blue transition-colors"
          >
            <div
              className={cn(
                "h-5 w-5 rounded border-2 flex items-center justify-center transition-all",
                allChecked
                  ? "bg-brand-blue border-brand-blue"
                  : "border-gray-300 bg-white"
              )}
            >
              {allChecked && <Check className="h-3.5 w-3.5 text-white" />}
            </div>
            Receive All ({totalItems} items)
          </button>
          <span className="text-xs text-text-muted font-medium">
            {checkedCount}/{totalItems} selected
          </span>
        </div>

        {/* Line items */}
        <div className="divide-y divide-border-custom/30">
          {lineStates.map((state, index) => (
            <POLineItemRow
              key={state.lineItem.id}
              state={state}
              onToggle={() => toggleItem(index)}
              onQtyChange={(qty) => updateQty(index, qty)}
            />
          ))}
        </div>

        {/* Total footer */}
        {checkedCount > 0 && (
          <div className="flex items-center justify-between px-4 py-3 bg-surface-secondary/30 border-t border-border-custom/60">
            <span className="text-sm font-semibold text-text-secondary">
              Receipt Total
            </span>
            <span className="text-base font-bold text-navy tabular-nums">
              {formatCurrency(totalCost)}
            </span>
          </div>
        )}
      </Card>

      {/* Confirm button */}
      <Button
        onClick={handleConfirm}
        disabled={checkedCount === 0}
        className="w-full h-14 bg-brand-orange hover:bg-brand-orange-hover text-white font-semibold text-base rounded-xl shadow-[0_2px_8px_rgba(232,121,43,0.25)] disabled:shadow-none"
      >
        <PackageCheck className="h-5 w-5 mr-2" />
        Confirm Receipt ({checkedCount} item{checkedCount !== 1 ? "s" : ""})
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

function POLineItemRow({
  state,
  onToggle,
  onQtyChange,
}: {
  state: LineItemReceiveState
  onToggle: () => void
  onQtyChange: (qty: number) => void
}) {
  const { lineItem, qtyToReceive, isChecked } = state
  const remaining = Math.max(0, lineItem.qtyOrdered - lineItem.qtyReceived)
  const isFullyReceived = remaining === 0
  const isPartiallyReceived = lineItem.qtyReceived > 0 && !isFullyReceived

  return (
    <div
      className={cn(
        "px-4 py-3 transition-colors",
        isChecked && "bg-brand-blue/[0.02]",
        isFullyReceived && "opacity-50"
      )}
    >
      <div className="flex items-start gap-3">
        {/* Checkbox */}
        <button
          onClick={onToggle}
          disabled={isFullyReceived}
          className="mt-0.5 shrink-0"
        >
          <div
            className={cn(
              "h-5 w-5 rounded border-2 flex items-center justify-center transition-all",
              isFullyReceived
                ? "bg-gray-100 border-gray-200"
                : isChecked
                  ? "bg-brand-orange border-brand-orange"
                  : "border-gray-300 bg-white hover:border-brand-orange/60"
            )}
          >
            {(isChecked || isFullyReceived) && (
              <Check className="h-3.5 w-3.5 text-white" />
            )}
          </div>
        </button>

        {/* Item info */}
        <div className="flex-1 min-w-0">
          <p
            className={cn(
              "text-sm font-semibold leading-tight",
              isChecked ? "text-navy" : "text-text-secondary"
            )}
          >
            {lineItem.productName || lineItem.description}
          </p>

          {/* Order / received status */}
          <div className="flex items-center gap-3 mt-1.5 flex-wrap">
            <span className="text-xs text-text-muted tabular-nums">
              Ordered: <span className="font-semibold text-navy">{lineItem.qtyOrdered}</span>
            </span>
            {lineItem.qtyReceived > 0 && (
              <span
                className={cn(
                  "text-xs tabular-nums font-medium",
                  isFullyReceived ? "text-status-green" : "text-brand-orange"
                )}
              >
                Received: {lineItem.qtyReceived}
              </span>
            )}
            {isFullyReceived && (
              <span className="text-[10px] font-bold text-status-green bg-green-50 px-1.5 py-0.5 rounded-full">
                COMPLETE
              </span>
            )}
            {isPartiallyReceived && (
              <span className="text-[10px] font-bold text-brand-orange bg-orange-50 px-1.5 py-0.5 rounded-full">
                PARTIAL
              </span>
            )}
            {lineItem.unitCost > 0 && (
              <span className="text-xs text-text-muted tabular-nums">
                @ {formatCurrency(lineItem.unitCost)}
              </span>
            )}
          </div>

          {/* Qty to receive — shown when checked and not fully received */}
          {isChecked && !isFullyReceived && (
            <div className="flex items-center gap-2 mt-2.5">
              <span className="text-xs text-text-muted font-medium w-[72px]">
                Receiving:
              </span>
              <div className="flex items-center bg-surface-secondary rounded-lg border border-border-custom/60">
                <button
                  onClick={() => onQtyChange(qtyToReceive - 1)}
                  disabled={qtyToReceive <= 0}
                  className="h-8 w-8 flex items-center justify-center text-text-muted hover:text-navy disabled:opacity-30 transition-colors"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <input
                  type="number"
                  min={0}
                  value={qtyToReceive}
                  onChange={(e) => onQtyChange(Number(e.target.value) || 0)}
                  className="w-14 text-center text-sm font-bold text-navy bg-transparent border-0 focus:outline-none focus:ring-0 tabular-nums [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <button
                  onClick={() => onQtyChange(qtyToReceive + 1)}
                  className="h-8 w-8 flex items-center justify-center text-text-muted hover:text-navy transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
              {remaining > 0 && qtyToReceive !== remaining && (
                <button
                  onClick={() => onQtyChange(remaining)}
                  className="text-[10px] font-semibold text-brand-blue hover:underline"
                >
                  All ({remaining})
                </button>
              )}
              {qtyToReceive > remaining && (
                <div className="flex items-center gap-1 text-brand-orange">
                  <AlertTriangle className="h-3 w-3" />
                  <span className="text-[10px] font-medium">Over-receiving</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Line total */}
        {isChecked && qtyToReceive > 0 && lineItem.unitCost > 0 && (
          <span className="text-sm font-bold text-navy tabular-nums shrink-0 mt-0.5">
            {formatCurrency(qtyToReceive * lineItem.unitCost)}
          </span>
        )}
      </div>
    </div>
  )
}
