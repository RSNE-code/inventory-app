"use client"

import Link from "next/link"
import { Card } from "@/components/ui/card"
import { AlertTriangle, ChevronRight } from "lucide-react"
import { formatQuantity } from "@/lib/utils"
import { getDisplayQty, getDisplayReorder } from "@/lib/units"
import type { LowStockItem } from "@/types"

export function LowStockList({ items }: { items: LowStockItem[] }) {
  if (items.length === 0) return null

  return (
    <Card className="p-4 rounded-xl border-border-custom shadow-brand">
      <div className="flex items-center gap-2 mb-3">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-status-yellow/10">
          <AlertTriangle className="h-3.5 w-3.5 text-status-yellow" />
        </div>
        <h3 className="font-semibold text-navy text-sm tracking-tight">Needs Attention</h3>
      </div>
      <div className="space-y-0.5">
        {items.map((item) => {
          const display = getDisplayQty(item)
          const reorder = getDisplayReorder({ ...item, reorderPoint: item.reorderPoint })
          return (
            <Link key={item.id} href={`/inventory/${item.id}`}>
              <div className="flex items-center justify-between py-2.5 px-2.5 -mx-1 rounded-lg hover:bg-surface-secondary active:scale-[0.99] transition-all duration-200 group">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-navy truncate">{item.name}</p>
                  <p className="text-xs text-text-muted mt-0.5">{item.categoryName}</p>
                </div>
                <div className="flex items-center gap-2 ml-3 shrink-0">
                  <div className="text-right">
                    <p className="text-sm font-bold text-status-yellow tabular-nums">
                      {formatQuantity(display.qty)} {display.unit}
                    </p>
                    <p className="text-[10px] text-text-muted tabular-nums">
                      Reorder at {formatQuantity(reorder.qty)}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-text-muted/40 group-hover:text-text-muted transition-colors" />
                </div>
              </div>
            </Link>
          )
        })}
      </div>
      <Link
        href="/inventory?status=low"
        className="flex items-center justify-center gap-1 text-sm text-brand-blue font-semibold mt-3 pt-3 border-t border-border-custom/60 hover:text-brand-blue-bright transition-colors"
      >
        View all low stock
        <ChevronRight className="h-4 w-4" />
      </Link>
    </Card>
  )
}
