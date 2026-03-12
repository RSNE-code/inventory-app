"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import {
  Search,
  X,
  ChevronRight,
  Package,
  Briefcase,
  ArrowLeft,
  Building2,
  Clock,
} from "lucide-react"
import { cn, formatCurrency } from "@/lib/utils"
import { usePoSearch } from "@/hooks/use-receiving"
import type { MatchedPO, POLineItemData } from "@/lib/ai/types"

interface POBrowserProps {
  onSelect: (po: MatchedPO) => void
  onBack: () => void
}

export function POBrowser({ onSelect, onBack }: POBrowserProps) {
  const [searchText, setSearchText] = useState("")
  const { data, isLoading } = usePoSearch(undefined, searchText || undefined)
  const pos = data?.data ?? []

  return (
    <Card className="rounded-xl border-border-custom shadow-brand-md overflow-hidden">
      {/* Header */}
      <div className="bg-navy px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10">
            <Package className="h-4 w-4 text-white/80" />
          </div>
          <div>
            <span className="text-sm font-bold text-white tracking-wide">
              Purchase Orders
            </span>
            <p className="text-[10px] text-white/50 font-medium">
              Select a PO to receive against
            </p>
          </div>
        </div>
      </div>

      <div className="p-3 space-y-2">
        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted/50" />
          <input
            type="text"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            placeholder="Search by PO #, supplier, or job..."
            autoFocus
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

        {/* Results */}
        <div className="max-h-[420px] overflow-y-auto rounded-lg">
          {isLoading ? (
            <div className="py-8 text-center">
              <div className="h-5 w-5 border-2 border-brand-blue/30 border-t-brand-blue rounded-full animate-spin mx-auto" />
              <p className="text-xs text-text-muted mt-2 font-medium">Loading POs...</p>
            </div>
          ) : pos.length === 0 ? (
            <div className="py-8 text-center">
              <Package className="h-8 w-8 text-text-muted/30 mx-auto mb-2" />
              <p className="text-sm text-text-muted font-medium">
                {searchText ? "No matching POs found" : "No purchase orders"}
              </p>
              {searchText && (
                <p className="text-xs text-text-muted/60 mt-1">
                  Try a different search term
                </p>
              )}
            </div>
          ) : (
            <div className="space-y-1.5">
              {pos.map((po, i) => (
                <ExpandablePORow
                  key={po.id}
                  po={po}
                  index={i}
                  onSelect={() => onSelect(po)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Back */}
        <div className="pt-1 border-t border-border-custom/40">
          <button
            onClick={onBack}
            className="w-full flex items-center justify-center gap-1.5 text-sm text-text-muted hover:text-navy font-medium py-3 rounded-lg hover:bg-surface-secondary transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back
          </button>
        </div>
      </div>
    </Card>
  )
}

// ─── Expandable PO Row ───

function ExpandablePORow({
  po,
  index,
  onSelect,
}: {
  po: MatchedPO
  index: number
  onSelect: () => void
}) {
  const [expanded, setExpanded] = useState(false)

  const openItems = po.lineItems.filter(
    (li) => Math.max(0, li.qtyOrdered - li.qtyReceived) > 0
  ).length
  const totalItems = po.lineItems.length

  // Find last non-voided receipt
  const activeReceipts = (po.receipts ?? []).filter((r) => !r.isVoided && r.items.length > 0)
  const lastReceipt = activeReceipts[0] // already sorted desc
  const lastReceivedDate = lastReceipt
    ? new Date(lastReceipt.receivedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })
    : null

  const formattedDate = new Date(po.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  })

  return (
    <div
      className={cn(
        "rounded-xl border overflow-hidden transition-all duration-300 animate-fade-in",
        expanded
          ? "border-brand-blue/30 shadow-[0_0_0_1px_rgba(46,125,186,0.08),0_4px_16px_rgba(46,125,186,0.08)]"
          : "border-border-custom/60 hover:border-border-custom"
      )}
      style={{ animationDelay: `${index * 40}ms` }}
    >
      {/* Summary row — tap to expand */}
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          "w-full flex items-center gap-3 px-3.5 py-3 text-left transition-colors",
          expanded ? "bg-brand-blue/[0.03]" : "hover:bg-surface-secondary/50"
        )}
      >
        {/* PO number badge */}
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-navy text-white">
          <span className="text-[11px] font-extrabold tabular-nums tracking-tight leading-none">
            {po.poNumber}
          </span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-extrabold text-navy tabular-nums tracking-tight">
              PO #{po.poNumber}
            </span>
            {po.amount != null && (
              <span className="text-[11px] font-bold text-text-muted tabular-nums">
                {formatCurrency(po.amount)}
              </span>
            )}
          </div>

          {/* Supplier name — prominent */}
          <div className="flex items-center gap-1.5 mt-0.5">
            <Building2 className="h-3 w-3 text-text-muted/50 shrink-0" />
            <p className="text-[12px] text-text-secondary font-semibold truncate">
              {po.supplierName}
            </p>
          </div>

          {/* Job name */}
          {po.jobName && (
            <div className="flex items-center gap-1.5 mt-0.5">
              <Briefcase className="h-3 w-3 text-brand-blue shrink-0" />
              <span className="text-[11px] font-semibold text-brand-blue truncate">
                {po.jobName}
              </span>
            </div>
          )}

          {/* Last received indicator */}
          {lastReceivedDate && (
            <div className="flex items-center gap-1 mt-0.5">
              <Clock className="h-2.5 w-2.5 text-brand-orange/60 shrink-0" />
              <span className="text-[10px] font-medium text-brand-orange/80">
                Last received {lastReceivedDate}
              </span>
            </div>
          )}
        </div>

        {/* Right side: expand indicator + meta */}
        <div className="shrink-0 flex flex-col items-center gap-1">
          <div
            className={cn(
              "h-7 w-7 rounded-full flex items-center justify-center transition-all duration-300",
              expanded
                ? "bg-brand-blue/10 text-brand-blue"
                : "bg-surface-secondary text-text-muted/50"
            )}
          >
            <ChevronRight
              className={cn(
                "h-3.5 w-3.5 transition-transform duration-300",
                expanded && "rotate-90"
              )}
            />
          </div>
          {!expanded && (
            <span className="text-[9px] font-bold text-text-muted/40 tabular-nums">
              {openItems}/{totalItems}
            </span>
          )}
        </div>
      </button>

      {/* Expanded: line items + select button */}
      <div
        className={cn(
          "grid transition-all duration-300 ease-in-out",
          expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="overflow-hidden">
          {po.lineItems.length > 0 && (
            <div className="border-t border-border-custom/50">
              {/* Column header */}
              <div className="flex items-center px-3.5 py-1.5 bg-surface-secondary/70 text-[9px] font-bold text-text-muted uppercase tracking-[0.08em]">
                <span className="flex-1">Item</span>
                <span className="w-12 text-center">Ord</span>
                <span className="w-12 text-center">Rcvd</span>
              </div>

              <div className="max-h-[200px] overflow-y-auto">
                {po.lineItems.map((li, i) => {
                  const remaining = Math.max(0, li.qtyOrdered - li.qtyReceived)
                  const isComplete = remaining === 0
                  return (
                    <div
                      key={li.id}
                      className={cn(
                        "flex items-center px-3.5 py-2 border-b border-border-custom/20 last:border-b-0",
                        isComplete && "opacity-35",
                        expanded && "animate-fade-in"
                      )}
                      style={expanded ? { animationDelay: `${i * 30}ms` } : undefined}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-semibold text-navy truncate">
                          {li.productName || li.description}
                        </p>
                        {li.unitCost > 0 && (
                          <p className="text-[10px] text-text-muted tabular-nums">
                            @ {formatCurrency(li.unitCost)}
                          </p>
                        )}
                      </div>
                      <span className="w-12 text-center text-[12px] font-bold text-navy tabular-nums">
                        {li.qtyOrdered}
                      </span>
                      <span
                        className={cn(
                          "w-12 text-center text-[12px] font-bold tabular-nums",
                          isComplete
                            ? "text-status-green"
                            : li.qtyReceived > 0
                              ? "text-brand-orange"
                              : "text-text-muted/40"
                        )}
                      >
                        {li.qtyReceived}
                      </span>
                    </div>
                  )
                })}
              </div>

              {/* Footer with date + select button */}
              <div className="flex items-center justify-between px-3.5 py-2.5 bg-surface-secondary/50 border-t border-border-custom/30">
                <span className="text-[10px] font-semibold text-text-muted">
                  {totalItems} item{totalItems !== 1 ? "s" : ""} · {formattedDate}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onSelect()
                  }}
                  className={cn(
                    "px-4 py-1.5 rounded-lg text-[12px] font-bold transition-all",
                    "bg-brand-orange text-white hover:bg-brand-orange-hover",
                    "shadow-[0_2px_8px_rgba(232,121,43,0.25)]",
                    "active:scale-[0.96]"
                  )}
                >
                  Select PO
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
