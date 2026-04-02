/**
 * StockBadge — In Stock / Low Stock / Out of Stock pill.
 * Matches web's stock-badge.tsx.
 */
import { Badge } from "@/components/ui/Badge";
import { getStockStatus } from "@/lib/utils";

interface StockBadgeProps {
  currentQty: number;
  reorderPoint: number;
}

const STATUS_MAP = {
  "in-stock": { label: "In Stock", variant: "green" as const },
  low: { label: "Low Stock", variant: "yellow" as const },
  out: { label: "Out of Stock", variant: "red" as const },
};

export function StockBadge({ currentQty, reorderPoint }: StockBadgeProps) {
  const status = getStockStatus(currentQty, reorderPoint);
  const config = STATUS_MAP[status];
  return <Badge label={config.label} variant={config.variant} />;
}
