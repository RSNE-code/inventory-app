"use client"

import Link from "next/link"
import { Card } from "@/components/ui/card"
import { AlertTriangle } from "lucide-react"
import { formatQuantity } from "@/lib/utils"
import type { LowStockItem } from "@/types"

export function LowStockList({ items }: { items: LowStockItem[] }) {
  if (items.length === 0) return null

  return (
    <Card className="p-4 rounded-xl border-border-custom">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="h-4 w-4 text-status-yellow" />
        <h3 className="font-semibold text-navy">Needs Attention</h3>
      </div>
      <div className="space-y-2">
        {items.map((item) => (
          <Link key={item.id} href={`/inventory/${item.id}`}>
            <div className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-surface-secondary transition-colors duration-200">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-navy truncate">{item.name}</p>
                <p className="text-xs text-text-muted">{item.categoryName}</p>
              </div>
              <div className="text-right ml-3 shrink-0">
                <p className="text-sm font-semibold text-status-yellow tabular-nums">
                  {formatQuantity(item.currentQty)} {item.unitOfMeasure}
                </p>
                <p className="text-xs text-text-muted tabular-nums">
                  Reorder at {formatQuantity(item.reorderPoint)}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
      <Link
        href="/inventory?status=low"
        className="block text-center text-sm text-brand-blue font-medium mt-3 hover:underline"
      >
        View all low stock items
      </Link>
    </Card>
  )
}
