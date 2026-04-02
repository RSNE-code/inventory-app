/**
 * BOM utilities — stock level helpers.
 * Ported from web src/lib/bom-utils.ts.
 */
import { colors } from "@/constants/colors";

export type StockLevel = "sufficient" | "low" | "out" | "unknown";

export function getItemStockLevel(item: {
  currentQty?: number;
  quantity?: number;
}): StockLevel {
  const current = item.currentQty ?? 0;
  const needed = item.quantity ?? 0;
  if (current <= 0) return "out";
  if (current < needed) return "low";
  if (current >= needed) return "sufficient";
  return "unknown";
}

export const stockDotColor: Record<StockLevel, string> = {
  sufficient: colors.statusGreen,
  low: colors.statusYellow,
  out: colors.statusRed,
  unknown: colors.statusGray,
};

export const stockLabel: Record<StockLevel, string> = {
  sufficient: "In Stock",
  low: "Low Stock",
  out: "Out of Stock",
  unknown: "Unknown",
};
