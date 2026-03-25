import type { CatalogMatch, ConfirmedBomItem } from "@/lib/ai/types"

export type StockLevel = "sufficient" | "low" | "out" | "unknown"

export function getItemStockLevel(item: ConfirmedBomItem): StockLevel {
  if (item.isNonCatalog) return "unknown"
  if (item.currentQty <= 0) return "out"
  if (item.currentQty < item.qtyNeeded) return "low"
  return "sufficient"
}

export function getMatchStockLevel(match: CatalogMatch, qtyNeeded: number): StockLevel {
  if (match.isNonCatalog || !match.matchedProduct) return "unknown"
  const qty = match.matchedProduct.currentQty
  if (qty <= 0) return "out"
  if (qty < qtyNeeded) return "low"
  return "sufficient"
}

export const stockDotColor: Record<StockLevel, string> = {
  sufficient: "bg-green-500",
  low: "bg-yellow-500",
  out: "bg-red-500",
  unknown: "bg-surface-secondary",
}

export const stockLabel: Record<StockLevel, string> = {
  sufficient: "In stock",
  low: "Low stock",
  out: "Out of stock",
  unknown: "Unknown",
}
