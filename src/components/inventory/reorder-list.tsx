"use client"

import { useQuery } from "@tanstack/react-query"
import { Card } from "@/components/ui/card"
import { EmptyState } from "@/components/shared/empty-state"
import { formatCurrency, formatQuantity } from "@/lib/utils"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import {
  CheckCircle,
  ClipboardCopy,
  AlertTriangle,
  XCircle,
  Package,
} from "lucide-react"

interface ReorderItem {
  id: string
  name: string
  sku: string | null
  currentQty: number
  reorderPoint: number
  suggestedQty: number
  lastCost: number
  estimatedCost: number
  unitOfMeasure: string
  categoryName: string
  isOutOfStock: boolean
}

interface SupplierGroup {
  supplierId: string | null
  supplierName: string
  items: ReorderItem[]
  totalItems: number
  totalEstimatedCost: number
}

interface ReorderData {
  groups: SupplierGroup[]
  summary: {
    totalItems: number
    totalEstimatedCost: number
    supplierCount: number
  }
}

function useReorderList() {
  return useQuery<{ data: ReorderData }>({
    queryKey: ["reorder-list"],
    queryFn: async () => {
      const res = await fetch("/api/reorder-list")
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.error || "Failed to load reorder list")
      }
      return res.json()
    },
  })
}

function formatCopyText(group: SupplierGroup): string {
  const date = new Date().toLocaleDateString()
  const lines = group.items.map(
    (item) =>
      `${item.name} — Qty: ${formatQuantity(item.suggestedQty)} ${item.unitOfMeasure} — Est: ${formatCurrency(item.estimatedCost)}`
  )
  return [
    `REORDER LIST — ${group.supplierName}`,
    `Date: ${date}`,
    "",
    ...lines,
    "",
    `Total: ${group.totalItems} item${group.totalItems !== 1 ? "s" : ""} — Est. ${formatCurrency(group.totalEstimatedCost)}`,
  ].join("\n")
}

export function ReorderList() {
  const { data, isLoading, error } = useReorderList()
  const reorderData = data?.data

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-20 rounded-xl skeleton-shimmer" />
        <div className="h-48 rounded-xl skeleton-shimmer stagger-1" />
        <div className="h-48 rounded-xl skeleton-shimmer stagger-2" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="text-center py-12 animate-fade-in">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-status-red/10 mx-auto mb-3">
          <AlertTriangle className="h-7 w-7 text-status-red" />
        </div>
        <p className="text-text-secondary font-medium mb-1">Failed to load reorder list</p>
        <p className="text-text-muted text-sm">{error.message}</p>
      </div>
    )
  }

  if (!reorderData || reorderData.groups.length === 0) {
    return (
      <EmptyState
        icon={CheckCircle}
        title="Inventory Is Healthy"
        description="No items are at or below their reorder point. Check back later."
      />
    )
  }

  const { groups, summary } = reorderData

  return (
    <div className="space-y-4">
      {/* Summary bar */}
      <Card className="px-4 py-4 rounded-xl border-border-custom shadow-brand card-accent-orange overflow-hidden bg-brand-orange/[0.04] animate-fade-in-up">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">Reorder Summary</p>
            <p className="text-2xl font-extrabold text-navy tabular-nums mt-0.5">
              {summary.totalItems} item{summary.totalItems !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wide">Est. Cost</p>
            <p className="text-xl font-extrabold text-brand-orange tabular-nums mt-0.5">
              {formatCurrency(summary.totalEstimatedCost)}
            </p>
          </div>
        </div>
        <p className="text-xs text-text-muted mt-2">
          Across {summary.supplierCount} supplier{summary.supplierCount !== 1 ? "s" : ""}
        </p>
      </Card>

      {/* Supplier groups */}
      {groups.map((group: SupplierGroup, groupIdx: number) => (
        <Card
          key={group.supplierId || "unknown"}
          className={`rounded-xl border-border-custom shadow-brand card-accent-orange overflow-hidden animate-fade-in-up stagger-${Math.min(groupIdx + 1, 12)}`}
        >
          {/* Supplier header */}
          <div className="px-4 pt-4 pb-2 flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-orange/12">
                <Package className="h-4 w-4 text-brand-orange" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-bold text-navy truncate">{group.supplierName}</h3>
                <p className="text-xs text-text-muted">
                  {group.totalItems} item{group.totalItems !== 1 ? "s" : ""} · Est. {formatCurrency(group.totalEstimatedCost)}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(formatCopyText(group))
                  toast.success(`Copied ${group.supplierName} order list`)
                } catch {
                  toast.error("Failed to copy to clipboard")
                }
              }}
              className="flex items-center gap-1.5 h-10 px-3 rounded-xl text-sm font-semibold text-brand-blue hover:bg-brand-blue/5 active:scale-[0.97] transition-all shrink-0"
            >
              <ClipboardCopy className="h-4 w-4" />
              Copy
            </button>
          </div>

          {/* Item rows */}
          <div>
            {group.items.map((item: ReorderItem, i: number) => (
              <div
                key={item.id}
                className={cn(
                  "flex items-center gap-3 px-4 min-h-[48px] py-2.5",
                  i < group.items.length - 1 && "border-b border-border-custom/40"
                )}
              >
                {/* Status dot */}
                <span className={cn(
                  "h-2 w-2 rounded-full shrink-0",
                  item.isOutOfStock ? "bg-status-red" : "bg-status-yellow"
                )} />

                {/* Product info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-navy truncate">{item.name}</p>
                  <p className="text-xs text-text-muted">
                    {item.isOutOfStock ? (
                      <span className="text-status-red font-medium">Out of stock</span>
                    ) : (
                      <>{formatQuantity(item.currentQty)} / {formatQuantity(item.reorderPoint)} {item.unitOfMeasure}</>
                    )}
                  </p>
                </div>

                {/* Order qty + cost */}
                <div className="text-right shrink-0">
                  <p className="text-sm font-bold text-brand-orange tabular-nums">
                    {formatQuantity(item.suggestedQty)} {item.unitOfMeasure}
                  </p>
                  {item.estimatedCost > 0 && (
                    <p className="text-xs text-text-muted tabular-nums">
                      {formatCurrency(item.estimatedCost)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  )
}
