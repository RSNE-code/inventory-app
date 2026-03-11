"use client"

import { useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileText, Check, ArrowRight, Search, X, Building2, Briefcase, DollarSign, Calendar } from "lucide-react"
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
        onSelect={(po) => {
          onConfirm(po)
        }}
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
    matchedPO.confidence >= 0.9 ? "Exact match" :
    matchedPO.confidence >= 0.7 ? "High confidence" :
    matchedPO.confidence >= 0.5 ? "Likely match" : "Possible match"

  const confidenceColor =
    matchedPO.confidence >= 0.7 ? "text-status-green bg-green-50" :
    matchedPO.confidence >= 0.5 ? "text-brand-orange bg-orange-50" :
    "text-text-muted bg-surface-secondary"

  const formattedDate = new Date(matchedPO.createdAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })

  return (
    <Card className="rounded-xl border-border-custom shadow-brand overflow-hidden animate-fade-in">
      {/* Header bar */}
      <div className="bg-brand-blue/6 px-4 py-2.5 flex items-center justify-between border-b border-brand-blue/10">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-brand-blue" />
          <span className="text-sm font-semibold text-navy">Purchase Order Match</span>
        </div>
        <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full", confidenceColor)}>
          {confidenceLabel}
        </span>
      </div>

      {/* PO details */}
      <div className="p-4 space-y-3">
        {/* PO Number — prominent */}
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-navy/5">
            <span className="text-lg font-extrabold text-navy tabular-nums">PO</span>
          </div>
          <div>
            <p className="text-xl font-extrabold text-navy tabular-nums tracking-tight">
              #{matchedPO.poNumber}
            </p>
            <p className="text-xs text-text-muted font-medium mt-0.5">
              {matchedPO.supplierName}
            </p>
          </div>
        </div>

        {/* Detail rows */}
        <div className="grid grid-cols-2 gap-2">
          {matchedPO.amount != null && (
            <DetailRow icon={DollarSign} label="Amount" value={formatCurrency(matchedPO.amount)} />
          )}
          <DetailRow icon={Calendar} label="Created" value={formattedDate} />
          {matchedPO.clientName && (
            <DetailRow icon={Building2} label="Client" value={matchedPO.clientName} />
          )}
          {matchedPO.jobName && (
            <DetailRow icon={Briefcase} label="Project" value={matchedPO.jobName} truncate />
          )}
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 pt-1">
          <Button
            onClick={() => onConfirm(matchedPO)}
            className="flex-1 h-11 bg-brand-orange hover:bg-brand-orange-hover text-white font-semibold rounded-xl shadow-[0_2px_8px_rgba(232,121,43,0.25)]"
          >
            <Check className="h-4 w-4 mr-1.5" />
            Use This PO
          </Button>
          <Button
            variant="outline"
            onClick={() => setMode("search")}
            className="h-11 px-3 rounded-xl border-border-custom text-text-secondary hover:text-navy"
          >
            <Search className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            onClick={onSkip}
            className="h-11 px-3 rounded-xl text-text-muted hover:text-navy"
          >
            Skip
          </Button>
        </div>
      </div>
    </Card>
  )
}

function DetailRow({
  icon: Icon,
  label,
  value,
  truncate,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  truncate?: boolean
}) {
  return (
    <div className="flex items-center gap-2 py-1.5 px-2 rounded-lg bg-surface-secondary/60">
      <Icon className="h-3.5 w-3.5 text-text-muted shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] text-text-muted font-medium leading-none">{label}</p>
        <p className={cn("text-xs font-semibold text-navy mt-0.5 leading-tight", truncate && "truncate")}>
          {value}
        </p>
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
    <Card className="rounded-xl border-border-custom shadow-brand overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="bg-surface-secondary px-4 py-2.5 flex items-center justify-between border-b border-border-custom">
        <div className="flex items-center gap-2">
          <Search className="h-4 w-4 text-text-muted" />
          <span className="text-sm font-semibold text-navy">Find Purchase Order</span>
        </div>
        {onBack && (
          <button onClick={onBack} className="text-xs text-brand-blue font-medium hover:underline">
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
        <div className="max-h-[200px] overflow-y-auto space-y-1">
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
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-brand-blue/5 transition-colors text-left group"
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
                    {[po.supplierName, po.clientName, po.jobName].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-text-muted/40 group-hover:text-brand-blue shrink-0 ml-2 transition-colors" />
              </button>
            ))
          )}
        </div>

        {/* Skip */}
        <button
          onClick={onSkip}
          className="w-full text-center text-sm text-text-muted hover:text-navy font-medium py-2 transition-colors"
        >
          No PO — ad hoc purchase
        </button>
      </div>
    </Card>
  )
}
