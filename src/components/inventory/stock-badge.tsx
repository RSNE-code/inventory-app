import { cn, getStockStatus } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

interface StockBadgeProps {
  currentQty: number
  reorderPoint: number
}

const statusConfig = {
  "in-stock": { label: "In Stock", className: "bg-status-green/15 text-status-green border-0" },
  "low": { label: "Low Stock", className: "bg-status-yellow/15 text-status-yellow border-0" },
  "out": { label: "Out of Stock", className: "bg-status-red/15 text-status-red border-0" },
}

export function StockBadge({ currentQty, reorderPoint }: StockBadgeProps) {
  const status = getStockStatus(currentQty, reorderPoint)
  const config = statusConfig[status]

  return (
    <Badge variant="outline" className={cn("text-xs font-medium", config.className)}>
      {config.label}
    </Badge>
  )
}
