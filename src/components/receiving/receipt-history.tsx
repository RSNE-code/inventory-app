"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import {
  Search,
  X,
  ChevronRight,
  Building2,
  FileText,
  Briefcase,
  Undo2,
  AlertTriangle,
  PackageCheck,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useReceiptHistory, useVoidReceipt } from "@/hooks/use-receiving"
import type { ReceiptData } from "@/hooks/use-receiving"
import { toast } from "sonner"

export function ReceiptHistory() {
  const [searchText, setSearchText] = useState("")
  const { data, isLoading } = useReceiptHistory(searchText || undefined)
  const receipts = data?.data ?? []

  return (
    <div className="space-y-3">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted/50" />
        <input
          type="text"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          placeholder="Search by supplier, PO #, or notes..."
          className="w-full rounded-xl border border-border-custom pl-9 pr-8 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue/40 placeholder:text-text-muted/50 transition-all"
        />
        {searchText && (
          <button
            onClick={() => setSearchText("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-surface-secondary flex items-center justify-center text-text-muted hover:text-navy hover:bg-gray-200 transition-colors"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {/* List */}
      {isLoading ? (
        <div className="py-10 text-center">
          <div className="h-5 w-5 border-2 border-brand-blue/30 border-t-brand-blue rounded-full animate-spin mx-auto" />
          <p className="text-xs text-text-muted mt-2 font-medium">Loading receipts...</p>
        </div>
      ) : receipts.length === 0 ? (
        <div className="py-10 text-center">
          <PackageCheck className="h-10 w-10 text-text-muted/20 mx-auto mb-2" />
          <p className="text-sm text-text-muted font-medium">
            {searchText ? "No matching receipts" : "No receipts yet"}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {receipts.map((receipt, i) => (
            <ReceiptRow key={receipt.id} receipt={receipt} index={i} />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Receipt Row ───

function ReceiptRow({ receipt, index }: { receipt: ReceiptData; index: number }) {
  const [expanded, setExpanded] = useState(false)
  const [showVoidConfirm, setShowVoidConfirm] = useState(false)
  const voidReceipt = useVoidReceipt()

  const isVoided = receipt.notes?.includes("[VOIDED]") ?? false
  const receiveTransactions = receipt.transactions.filter((t) => t.type === "RECEIVE")
  const itemCount = receiveTransactions.length

  const date = new Date(receipt.receivedAt)
  const formattedDate = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })
  const formattedTime = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  })

  async function handleVoid() {
    try {
      await voidReceipt.mutateAsync(receipt.id)
      toast.success("Receipt voided — stock reversed")
      setShowVoidConfirm(false)
      setExpanded(false)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to void receipt")
    }
  }

  return (
    <Card
      className={cn(
        "rounded-xl border-border-custom overflow-hidden transition-all duration-300 animate-fade-in",
        isVoided && "opacity-50",
        expanded && !isVoided && "shadow-brand-md border-brand-blue/20"
      )}
      style={{ animationDelay: `${index * 30}ms` }}
    >
      {/* Summary row */}
      <button
        onClick={() => !isVoided && setExpanded(!expanded)}
        disabled={isVoided}
        className={cn(
          "w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors",
          !isVoided && "hover:bg-surface-secondary/50",
          expanded && "bg-brand-blue/[0.02]"
        )}
      >
        {/* Date column */}
        <div className="shrink-0 text-center w-12">
          <p className="text-[13px] font-extrabold text-navy tabular-nums leading-tight">
            {date.toLocaleDateString("en-US", { month: "short" })}
          </p>
          <p className="text-lg font-extrabold text-navy tabular-nums leading-none">
            {date.getDate()}
          </p>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Building2 className="h-3 w-3 text-text-muted/50 shrink-0" />
            <span className="text-[13px] font-bold text-navy truncate">
              {receipt.supplier.name}
            </span>
          </div>

          <div className="flex items-center gap-3 mt-0.5">
            {receipt.purchaseOrder && (
              <div className="flex items-center gap-1">
                <FileText className="h-3 w-3 text-brand-blue shrink-0" />
                <span className="text-[11px] font-semibold text-brand-blue">
                  PO #{receipt.purchaseOrder.poNumber}
                </span>
              </div>
            )}
            {receipt.purchaseOrder?.jobName && (
              <div className="flex items-center gap-1">
                <Briefcase className="h-3 w-3 text-text-muted/40 shrink-0" />
                <span className="text-[11px] text-text-muted truncate">
                  {receipt.purchaseOrder.jobName}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] text-text-muted/60 font-medium tabular-nums">
              {itemCount} item{itemCount !== 1 ? "s" : ""}
            </span>
            {isVoided && (
              <span className="text-[9px] font-bold text-status-red bg-red-50 px-2 py-0.5 rounded-full uppercase tracking-wider">
                Voided
              </span>
            )}
          </div>
        </div>

        {/* Expand chevron */}
        {!isVoided && (
          <div
            className={cn(
              "h-7 w-7 rounded-full flex items-center justify-center shrink-0 transition-all duration-300",
              expanded
                ? "bg-brand-blue/10 text-brand-blue"
                : "bg-surface-secondary text-text-muted/40"
            )}
          >
            <ChevronRight
              className={cn(
                "h-3.5 w-3.5 transition-transform duration-300",
                expanded && "rotate-90"
              )}
            />
          </div>
        )}
      </button>

      {/* Expanded detail */}
      <div
        className={cn(
          "grid transition-all duration-300 ease-in-out",
          expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="overflow-hidden">
          <div className="border-t border-border-custom/50">
            {/* Column header */}
            <div className="flex items-center px-4 py-1.5 bg-surface-secondary/70 text-[9px] font-bold text-text-muted uppercase tracking-[0.08em]">
              <span className="flex-1">Item</span>
              <span className="w-14 text-center">Qty</span>
            </div>

            {/* Items */}
            <div className="max-h-[240px] overflow-y-auto">
              {receiveTransactions.map((txn, i) => (
                <div
                  key={txn.id}
                  className={cn(
                    "flex items-center px-4 py-2.5 border-b border-border-custom/20 last:border-b-0",
                    expanded && "animate-fade-in"
                  )}
                  style={expanded ? { animationDelay: `${i * 30}ms` } : undefined}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold text-navy truncate">
                      {txn.product.name}
                    </p>
                    <p className="text-[10px] text-text-muted">
                      {txn.product.unitOfMeasure}
                    </p>
                  </div>
                  <span className="w-14 text-center text-[12px] font-bold text-navy tabular-nums">
                    {Number(txn.quantity)}
                  </span>
                </div>
              ))}
            </div>

            {/* Footer with time + notes + undo */}
            <div className="px-4 py-3 bg-surface-secondary/30 border-t border-border-custom/30 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-text-muted/60 font-medium">
                  {formattedDate} at {formattedTime}
                </span>
              </div>

              {receipt.notes && !receipt.notes.startsWith("[VOIDED]") && (
                <p className="text-[11px] text-text-muted italic">
                  {receipt.notes}
                </p>
              )}

              {/* Void confirmation */}
              {showVoidConfirm ? (
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-50 border border-red-100 animate-fade-in">
                  <AlertTriangle className="h-4 w-4 text-status-red shrink-0" />
                  <div className="flex-1">
                    <p className="text-[11px] font-bold text-status-red">
                      Undo this receipt?
                    </p>
                    <p className="text-[10px] text-red-600/70 mt-0.5">
                      Stock will be reversed for all {itemCount} item{itemCount !== 1 ? "s" : ""}
                    </p>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button
                      onClick={() => setShowVoidConfirm(false)}
                      className="px-3 py-1.5 text-[11px] font-bold text-text-muted rounded-lg hover:bg-white transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleVoid}
                      disabled={voidReceipt.isPending}
                      className="px-3 py-1.5 text-[11px] font-bold text-white bg-status-red rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors"
                    >
                      {voidReceipt.isPending ? "Undoing..." : "Confirm"}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowVoidConfirm(true)}
                  className="flex items-center gap-1.5 text-[12px] font-semibold text-status-red hover:text-red-700 transition-colors"
                >
                  <Undo2 className="h-3.5 w-3.5" />
                  Undo Receipt
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}
