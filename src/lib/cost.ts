export function calculateWAC(
  existingQty: { toString(): string } | number,
  existingWAC: { toString(): string } | number,
  receivedQty: { toString(): string } | number,
  purchaseCost: { toString(): string } | number
): number {
  const eQty = Number(existingQty)
  const eWAC = Number(existingWAC)
  const rQty = Number(receivedQty)
  const pCost = Number(purchaseCost)

  if (eQty <= 0) return pCost

  return ((eQty * eWAC) + (rQty * pCost)) / (eQty + rQty)
}
