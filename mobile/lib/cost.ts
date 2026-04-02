/**
 * Cost calculation — WAC (Weighted Average Cost).
 * Ported from web src/lib/cost.ts.
 */

/** Calculate weighted average cost on receipt */
export function calculateWAC(
  existingQty: number,
  existingWAC: number,
  receivedQty: number,
  purchaseCost: number
): number {
  const totalQty = existingQty + receivedQty;
  if (totalQty <= 0) return 0;
  return ((existingQty * existingWAC) + (receivedQty * purchaseCost)) / totalQty;
}
