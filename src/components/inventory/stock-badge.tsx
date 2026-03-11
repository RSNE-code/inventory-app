import { cn, getStockStatus } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

interface StockBadgeProps {
  currentQty: number
  reorderPoint: number
}

const statusConfig = {
  "in-stock": { label: "In Stock", dot: "bg-status-green", className: "bg-status-green/8 text-status-green border-0" },
  "low": { label: "Low Stock", dot: "bg-status-yellow", className: "bg-status-yellow/8 text-status-yellow border-0" },
  "out": { label: "Out of Stock", dot: "bg-status-red animate-pulse", className: "bg-status-red/8 text-status-red border-0" },
}

export function StockBadge({ currentQty, reorderPoint }: StockBadgeProps) {
  const status = getStockStatus(currentQty, reorderPoint)
  const config = statusConfig[status]

  return (
    <Badge variant="outline" className={cn("text-xs font-semibold gap-1.5", config.className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full shrink-0", config.dot)} />
      {config.label}
    </Badge>
  )
}
