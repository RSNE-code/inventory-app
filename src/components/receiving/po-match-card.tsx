"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  FileText,
  Check,
  ArrowRight,
  Search,
  X,
  Briefcase,
  ChevronRight,
  Package,
} from "lucide-react"
import { cn, formatCurrency } from "@/lib/utils"
import { usePoSearch } from "@/hooks/use-receiving"
import type { MatchedPO } from "@/lib/ai/types"

interface POMatchCardProps {
  matchedPO: MatchedPO | null
  supplierId?: string
  onConfirm: (po: MatchedPO) => void
  onSkip: () => void
}

export function POMatchCard({ matchedPO, supplierId, onConfirm, onSkip }: POMatchCardProps) {
  const [mode, setMode] = useState<"matched" | "search">(matchedPO ? "matched" : "search")
  const [searchText, setSearchText] = useState("")

  if (mode === "search") {
    return (
      <POSearchView
        supplierId={supplierId}
        searchText={searchText}
        onSearchChange={setSearchText}
        onSelect={(po) => onConfirm(po)}
        onSkip={onSkip}
        onBack={matchedPO ? () => setMode("matched") : undefined}
      />
    )
  }

  if (!matchedPO) {
    return (
      <POSearchView
        supplierId={supplierId}
        searchText={searchText}
        onSearchChange={setSearchText}
        onSelect={(po) => onConfirm(po)}
        onSkip={onSkip}
      />
    )
  }

  const confidenceLabel =
    matchedPO.confidence >= 0.9
      ? "Exact match"
      : matchedPO.confidence >= 0.7
        ? "High confidence"
        : matchedPO.confidence >= 0.5
          ? "Likely match"
          : "Possible match"

  const confidenceColor =
    matchedPO.confidence >= 0.7
      ? "text-status-green bg-green-50 border-status-green/20"
      : matchedPO.confidence >= 0.5
        ? "text-brand-orange bg-orange-50 border-brand-orange/20"
        : "text-text-muted bg-surface-secondary border-border-custom"

  return (
    <Card className="rounded-xl border-border-custom shadow-brand-md overflow-hidden animate-fade-in-up">
      {/* Header bar */}
      <div className="bg-navy px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-white/70" />
          <span className="text-sm font-bold text-white tracking-wide">
            Purchase Order Match
          </span>
        </div>
        <span
          className={cn(
            "text-[10px] font-bold px-2.5 py-1 rounded-full border",
            confidenceColor
          )}
        >
          {confidenceLabel}
        </span>
      </div>

      <div className="p-4 space-y-3">
        {/* Expandable PO detail */}
        <ExpandablePO po={matchedPO} />

        {/* Action buttons */}
        <div className="flex gap-2 pt-1">
          <Button
            onClick={() => onConfirm(matchedPO)}
            className="flex-1 h-13 bg-brand-orange hover:bg-brand-orange-hover text-white font-bold text-[15px] rounded-xl shadow-[0_3px_12px_rgba(232,121,43,0.3)] hover:shadow-[0_4px_16px_rgba(232,121,43,0.4)] transition-all active:scale-[0.98]"
          >
            <Check className="h-5 w-5 mr-2" />
            Confirm PO
          </Button>
          <Button
            variant="outline"
            onClick={() => setMode("search")}
            className="h-13 px-4 rounded-xl border-border-custom text-text-secondary hover:text-navy hover:border-navy/30 transition-all"
          >
            <Search className="h-4 w-4 mr-1.5" />
            Different PO
          </Button>
        </div>
        <button
          onClick={onSkip}
          className="w-full text-center text-sm text-text-muted hover:text-navy font-medium py-1.5 transition-colors"
        >
          No PO — receive without
        </button>
      </div>
    </Card>
  )
}

// ─── Expandable PO Card (tap to show items) ───

function ExpandablePO({ po }: { po: MatchedPO }) {
  const [expanded, setExpanded] = useState(false)

  const formattedDate = new Date(po.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })

  return (
    <div
      className={cn(
        "rounded-xl border overflow-hidden transition-all duration-300",
        expanded
          ? "border-brand-blue/30 shadow-[0_0_0_1px_rgba(46,125,186,0.08),0_4px_16px_rgba(46,125,186,0.08)]"
          : "border-border-custom hover:border-brand-blue/20"
      )}
    >
      {/* Clickable summary row */}
      <button
        onClick={() => setExpanded(!expanded)}
        className={cn(
          "w-full flex items-center gap-3 px-4 py-3.5 text-left transition-colors",
          expanded ? "bg-brand-blue/[0.03]" : "hover:bg-surface-secondary/50"
        )}
      >
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-navy text-white">
          <span className="text-sm font-extrabold tabular-nums tracking-tight">
            {po.poNumber}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-base font-extrabold text-navy tracking-tight">
              PO #{po.poNumber}
            </span>
            {po.amount != null && (
              <span className="text-xs font-bold text-text-muted tabular-nums">
                {formatCurrency(po.amount)}
              </span>
            )}
          </div>
          <p className="text-[13px] text-text-secondary font-medium mt-0.5 truncate">
            {po.supplierName}
          </p>
          {po.jobName && (
            <div className="flex items-center gap-1.5 mt-1">
              <Briefcase className="h-3 w-3 text-brand-blue shrink-0" />
              <span className="text-xs font-semibold text-brand-blue truncate">
                {po.jobName}
              </span>
            </div>
          )}
        </div>
        <div className="shrink-0 flex flex-col items-center gap-1">
          <div
            className={cn(
              "h-8 w-8 rounded-full flex items-center justify-center transition-all duration-300",
              expanded
                ? "bg-brand-blue/10 text-brand-blue"
                : "bg-surface-secondary text-text-muted"
            )}
          >
            <ChevronRight
              className={cn(
                "h-4 w-4 transition-transform duration-300",
                expanded && "rotate-90"
              )}
            />
          </div>
          {!expanded && po.lineItems.length > 0 && (
            <span className="text-[9px] font-bold text-text-muted/60 uppercase tracking-wider">
              {po.lineItems.length} items
            </span>
          )}
        </div>
      </button>

      {/* Expanded item list with smooth height transition */}
      <div
        className={cn(
          "grid transition-all duration-300 ease-in-out",
          expanded ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        )}
      >
        <div className="overflow-hidden">
          {po.lineItems.length > 0 && (
            <div className="border-t border-border-custom/50">
              <div className="max-h-[260px] overflow-y-auto">
                {po.lineItems.map((li, i) => {
                  const remaining = Math.max(0, li.qtyOrdered - li.qtyReceived)
                  const isComplete = remaining === 0
                  return (
                    <div
                      key={li.id}
                      className={cn(
                        "flex items-center justify-between px-4 py-2.5 border-b border-border-custom/20 last:border-b-0",
                        isComplete && "opacity-40",
                        expanded && "animate-fade-in"
                      )}
                      style={expanded ? { animationDelay: `${i * 40}ms` } : undefined}
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-navy truncate">
                          {li.productName || li.description}
                        </p>
                        {li.unitCost > 0 && (
                          <p className="text-[10px] text-text-muted tabular-nums mt-0.5">
                            @ {formatCurrency(li.unitCost)}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-3">
                        <span className="text-sm font-bold text-navy tabular-nums">
                          x{li.qtyOrdered}
                        </span>
                        {isComplete && (
                          <span className="text-[9px] font-bold text-status-green bg-green-50 px-2 py-0.5 rounded-full">
                            RECEIVED
                          </span>
                        )}
                        {li.qtyReceived > 0 && !isComplete && (
                          <span className="text-[9px] font-bold text-brand-orange bg-orange-50 px-2 py-0.5 rounded-full">
                            {li.qtyReceived}/{li.qtyOrdered}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {/* Summary footer */}
              <div className="flex items-center gap-1.5 px-4 py-2.5 bg-surface-secondary/50 border-t border-border-custom/30">
                <Package className="h-3.5 w-3.5 text-text-muted" />
                <span className="text-[11px] font-semibold text-text-muted">
                  {po.lineItems.length} item{po.lineItems.length !== 1 ? "s" : ""}
                  {po.amount != null && <> · {formatCurrency(po.amount)} total</>}
                  {" · "}{formattedDate}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── PO Search View ───

function POSearchView({
  supplierId,
  searchText,
  onSearchChange,
  onSelect,
  onSkip,
  onBack,
}: {
  supplierId?: string
  searchText: string
  onSearchChange: (v: string) => void
  onSelect: (po: MatchedPO) => void
  onSkip: () => void
  onBack?: () => void
}) {
  const { data, isLoading } = usePoSearch(supplierId, searchText || undefined)
  const pos = data?.data ?? []

  return (
    <Card className="rounded-xl border-border-custom shadow-brand-md overflow-hidden animate-fade-in-up">
      {/* Header */}
      <div className="bg-navy px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-white/70" />
          <span className="text-sm font-bold text-white tracking-wide">Find Purchase Order</span>
        </div>
        {onBack && (
          <button
            onClick={onBack}
            className="text-xs text-white/70 hover:text-white font-semibold transition-colors"
          >
            Back
          </button>
        )}
      </div>

      <div className="p-3 space-y-2">
        {/* Search input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted/50" />
          <input
            type="text"
            value={searchText}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by PO #, project, or client..."
            className="w-full rounded-xl border border-border-custom pl-9 pr-8 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue/40 placeholder:text-text-muted/50 transition-all"
          />
          {searchText && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-surface-secondary flex items-center justify-center text-text-muted hover:text-navy hover:bg-gray-200 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Results */}
        <div className="max-h-[300px] overflow-y-auto rounded-lg">
          {isLoading ? (
            <div className="py-6 text-center">
              <div className="h-5 w-5 border-2 border-brand-blue/30 border-t-brand-blue rounded-full animate-spin mx-auto" />
              <p className="text-xs text-text-muted mt-2">Searching...</p>
            </div>
          ) : pos.length === 0 ? (
            <p className="text-sm text-text-muted text-center py-6">
              {searchText ? "No matching POs found" : "No open POs"}
            </p>
          ) : (
            <div className="space-y-1">
              {pos.map((po, i) => (
                <button
                  key={po.id}
                  onClick={() => onSelect(po)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-3 rounded-lg hover:bg-brand-blue/5 transition-all text-left group animate-fade-in",
                    "active:scale-[0.99] active:bg-brand-blue/8"
                  )}
                  style={{ animationDelay: `${i * 30}ms` }}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-navy tabular-nums">
                        PO #{po.poNumber}
                      </span>
                      {po.amount != null && (
                        <span className="text-xs text-text-muted tabular-nums">
                          {formatCurrency(po.amount)}
                        </span>
                      )}
                    </div>
                    <p className="text-[12px] text-text-muted truncate mt-0.5">
                      {po.supplierName}
                      {po.jobName && (
                        <> · <span className="text-brand-blue font-semibold">{po.jobName}</span></>
                      )}
                    </p>
                    {po.lineItems.length > 0 && (
                      <p className="text-[10px] text-text-muted/60 mt-0.5 font-medium">
                        {po.lineItems.length} item
                        {po.lineItems.length !== 1 ? "s" : ""}
                      </p>
                    )}
                  </div>
                  <ArrowRight className="h-4 w-4 text-text-muted/30 group-hover:text-brand-blue group-hover:translate-x-0.5 shrink-0 ml-2 transition-all" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Skip */}
        <div className="pt-1 border-t border-border-custom/40">
          <button
            onClick={onSkip}
            className="w-full text-center text-sm text-text-muted hover:text-navy font-medium py-3 rounded-lg hover:bg-surface-secondary transition-colors"
          >
            No PO — ad hoc purchase
          </button>
        </div>
      </div>
    </Card>
  )
}
