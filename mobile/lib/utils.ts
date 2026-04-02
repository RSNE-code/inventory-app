/**
 * Formatting utilities — ported from web's src/lib/utils.ts.
 */

/** Format as USD currency */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** Format quantity (strips trailing zeros) */
export function formatQuantity(qty: number): string {
  if (Number.isInteger(qty)) return qty.toString();
  return qty.toFixed(2).replace(/\.?0+$/, "");
}

/** Get stock status based on current qty vs reorder point */
export function getStockStatus(
  currentQty: number,
  reorderPoint: number
): "in-stock" | "low" | "out" {
  if (currentQty <= 0) return "out";
  if (currentQty <= reorderPoint) return "low";
  return "in-stock";
}

/** Get time-of-day greeting */
export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/** Truncate text with ellipsis */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 1) + "\u2026";
}
