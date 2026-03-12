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
  ChevronDown,
  ChevronUp,
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
      ? "text-status-green bg-green-50"
      : matchedPO.confidence >= 0.5
        ? "text-brand-orange bg-orange-50"
        : "text-text-muted bg-surface-secondary"

  return (
    <Card className="rounded-xl border-border-custom shadow-brand overflow-hidden animate-fade-in">
      {/* Header bar */}
      <div className="bg-brand-blue/6 px-4 py-2.5 flex items-center justify-between border-b border-brand-blue/10">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-brand-blue" />
          <span className="text-sm font-semibold text-navy">Purchase Order Match</span>
        </div>
        <span
          className={cn(
            "text-[10px] font-bold px-2 py-0.5 rounded-full",
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
            className="flex-1 h-12 bg-brand-orange hover:bg-brand-orange-hover text-white font-semibold rounded-xl shadow-[0_2px_8px_rgba(232,121,43,0.25)]"
          >
            <Check className="h-4 w-4 mr-1.5" />
            Confirm PO
          </Button>
          <Button
            variant="outline"
            onClick={() => setMode("search")}
            className="h-12 px-4 rounded-xl border-border-custom text-text-secondary hover:text-navy"
          >
            <Search className="h-4 w-4 mr-1.5" />
            Different PO
          </Button>
        </div>
        <button
          onClick={onSkip}
          className="w-full text-center text-sm text-text-muted hover:text-navy font-medium py-1 transition-colors"
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
    <div className="rounded-lg border border-border-custom/70 overflow-hidden">
      {/* Clickable summary row */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-3 py-3 text-left hover:bg-surface-secondary/40 transition-colors"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-navy/5">
          <span className="text-base font-extrabold text-navy tabular-nums">PO</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-lg font-extrabold text-navy tabular-nums tracking-tight">
              #{po.poNumber}
            </span>
            {po.amount != null && (
              <span className="text-xs font-semibold text-text-muted tabular-nums">
                {formatCurrency(po.amount)}
              </span>
            )}
          </div>
          <p className="text-xs text-text-muted font-medium mt-0.5">
            {po.supplierName}
            {po.jobName && <> · <span className="text-navy font-semibold">{po.jobName}</span></>}
          </p>
          {po.lineItems.length > 0 && (
            <p className="text-[10px] text-text-muted/70 mt-0.5">
              {po.lineItems.length} item{po.lineItems.length !== 1 ? "s" : ""} · {formattedDate}
            </p>
          )}
        </div>
        <div className="shrink-0 text-text-muted">
          {expanded ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </div>
      </button>

      {/* Expanded item list */}
      {expanded && po.lineItems.length > 0 && (
        <div className="border-t border-border-custom/40">
          {/* Job name banner (if present) */}
          {po.jobName && (
            <div className="flex items-center gap-2 px-3 py-2 bg-brand-blue/[0.04] border-b border-brand-blue/10">
              <Briefcase className="h-3.5 w-3.5 text-brand-blue shrink-0" />
              <span className="text-xs font-semibold text-navy">{po.jobName}</span>
            </div>
          )}

          <div className="divide-y divide-border-custom/30 max-h-[240px] overflow-y-auto">
            {po.lineItems.map((li) => {
              const remaining = Math.max(0, li.qtyOrdered - li.qtyReceived)
              const isComplete = remaining === 0
              return (
                <div
                  key={li.id}
                  className={cn(
                    "flex items-center justify-between px-3 py-2.5",
                    isComplete && "opacity-45"
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-navy truncate">
                      {li.productName || li.description}
                    </p>
                    {li.unitCost > 0 && (
                      <p className="text-[10px] text-text-muted tabular-nums mt-0.5">
                        @ {formatCurrency(li.unitCost)}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <span className="text-xs font-bold text-navy tabular-nums">
                      x{li.qtyOrdered}
                    </span>
                    {isComplete && (
                      <span className="text-[9px] font-bold text-status-green bg-green-50 px-1.5 py-0.5 rounded-full">
                        RECEIVED
                      </span>
                    )}
                    {li.qtyReceived > 0 && !isComplete && (
                      <span className="text-[9px] font-bold text-brand-orange bg-orange-50 px-1.5 py-0.5 rounded-full">
                        {li.qtyReceived}/{li.qtyOrdered}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Item count footer */}
          <div className="flex items-center gap-1.5 px-3 py-2 bg-surface-secondary/40 border-t border-border-custom/40">
            <Package className="h-3 w-3 text-text-muted" />
            <span className="text-[10px] font-semibold text-text-muted">
              {po.lineItems.length} item{po.lineItems.length !== 1 ? "s" : ""}
              {po.amount != null && <> · {formatCurrency(po.amount)} total</>}
            </span>
          </div>
        </div>
      )}
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
    <Card className="rounded-xl border-border-custom shadow-brand overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="bg-surface-secondary px-4 py-2.5 flex items-center justify-between border-b border-border-custom">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-text-muted" />
          <span className="text-sm font-semibold text-navy">Find Purchase Order</span>
        </div>
        {onBack && (
          <button
            onClick={onBack}
            className="text-xs text-brand-blue font-medium hover:underline"
          >
            Back
          </button>
        )}
      </div>

      <div className="p-3 space-y-2">
        {/* Search input */}
        <div className="relative">
          <input
            type="text"
            value={searchText}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by PO #, project, or client..."
            className="w-full rounded-lg border border-border-custom pl-3 pr-8 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue/40 placeholder:text-text-muted/60"
          />
          {searchText && (
            <button
              onClick={() => onSearchChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-navy"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Results */}
        <div className="max-h-[280px] overflow-y-auto divide-y divide-border-custom/40">
          {isLoading ? (
            <div className="py-4 text-center">
              <div className="h-4 w-4 border-2 border-brand-blue/30 border-t-brand-blue rounded-full animate-spin mx-auto" />
            </div>
          ) : pos.length === 0 ? (
            <p className="text-xs text-text-muted text-center py-4">
              {searchText ? "No matching POs found" : "No open POs"}
            </p>
          ) : (
            pos.map((po) => (
              <button
                key={po.id}
                onClick={() => onSelect(po)}
                className="w-full flex items-center justify-between px-3 py-2.5 hover:bg-brand-blue/5 transition-colors text-left group first:rounded-t-lg last:rounded-b-lg"
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
                  <p className="text-[11px] text-text-muted truncate mt-0.5">
                    {[po.supplierName, po.jobName, po.clientName]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  {po.lineItems.length > 0 && (
                    <p className="text-[10px] text-text-muted/70 mt-0.5">
                      {po.lineItems.length} item
                      {po.lineItems.length !== 1 ? "s" : ""}
                    </p>
                  )}
                </div>
                <ArrowRight className="h-4 w-4 text-text-muted/40 group-hover:text-brand-blue shrink-0 ml-2 transition-colors" />
              </button>
            ))
          )}
        </div>

        {/* Skip */}
        <div className="pt-1 border-t border-border-custom/40">
          <button
            onClick={onSkip}
            className="w-full text-center text-sm text-text-muted hover:text-navy font-medium py-2.5 rounded-lg hover:bg-surface-secondary transition-colors"
          >
            No PO — ad hoc purchase
          </button>
        </div>
      </div>
    </Card>
  )
}
