import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(value: number | string | { toString(): string }): string {
  const num = typeof value === "number" ? value : Number(value)
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num)
}

export function formatQuantity(value: number | string | { toString(): string }, unit?: string): string {
  const num = typeof value === "number" ? value : Number(value)
  const formatted = num % 1 === 0 ? num.toFixed(0) : num.toFixed(2)
  return unit ? `${formatted} ${unit}` : formatted
}

export type StockStatus = "in-stock" | "low" | "out"

export function getStockStatus(
  currentQty: number | { toString(): string },
  reorderPoint: number | { toString(): string }
): StockStatus {
  const qty = Number(currentQty)
  const reorder = Number(reorderPoint)
  if (qty <= 0) return "out"
  if (qty <= reorder) return "low"
  return "in-stock"
}
