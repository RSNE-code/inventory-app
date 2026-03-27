// ─── Standard UOM options for scroll picker ───

export const STANDARD_UNITS: { label: string; value: string }[] = [
  { label: "ea", value: "ea" },
  { label: "pcs", value: "pcs" },
  { label: "pc", value: "piece" },
  { label: "ct", value: "ct" },
  { label: "lbs", value: "lbs" },
  { label: "lf", value: "lf" },
  { label: "sf", value: "sf" },
  { label: "in", value: "in" },
  { label: "ft", value: "ft" },
  { label: "box", value: "box" },
  { label: "roll", value: "roll" },
  { label: "bag", value: "bag" },
  { label: "tube", value: "tube" },
  { label: "gal", value: "gal" },
  { label: "case", value: "case" },
  { label: "bndl", value: "bundle" },
  { label: "sht", value: "sheet" },
  { label: "pnl", value: "panel" },
  { label: "pair", value: "pair" },
  { label: "set", value: "set" },
  { label: "pack", value: "pack" },
]

/** Normalize AI-parsed unit variants to standard labels */
export function normalizeUnit(unit: string): string {
  const u = unit.toLowerCase().trim()
  const map: Record<string, string> = {
    each: "ea",
    "each one": "ea",
    pieces: "pcs",
    piece: "piece",
    pcs: "pcs",
    pc: "pcs",
    count: "ct",
    ct: "ct",
    lb: "lbs",
    lbs: "lbs",
    pound: "lbs",
    pounds: "lbs",
    "linear ft": "lf",
    "lineal ft": "lf",
    "linear feet": "lf",
    "lineal feet": "lf",
    lf: "lf",
    "sq ft": "sf",
    "square feet": "sf",
    "square foot": "sf",
    sf: "sf",
    feet: "ft",
    foot: "ft",
    ft: "ft",
    inch: "in",
    inches: "in",
    in: "in",
    boxes: "box",
    box: "box",
    rolls: "roll",
    roll: "roll",
    bags: "bag",
    bag: "bag",
    tubes: "tube",
    tube: "tube",
    gallon: "gal",
    gallons: "gal",
    gal: "gal",
    cases: "case",
    case: "case",
    bundles: "bundle",
    bundle: "bundle",
    sheets: "sheet",
    sheet: "sheet",
    panels: "panel",
    panel: "panel",
    pairs: "pair",
    pair: "pair",
    sets: "set",
    set: "set",
    packs: "pack",
    pack: "pack",
  }
  return map[u] || u
}

// Convert a dimension value to feet
function toFeet(value: number, unit: string): number {
  return unit === "in" ? value / 12 : value
}

interface ProductForDisplay {
  currentQty: number | { toString(): string }
  unitOfMeasure: string
  shopUnit?: string | null
  dimLength?: number | { toString(): string } | null
  dimLengthUnit?: string | null
  dimWidth?: number | { toString(): string } | null
  dimWidthUnit?: string | null
}

/**
 * Returns the display quantity and unit for a product.
 * If shopUnit is set, multiplies currentQty by dimensions.
 * Otherwise returns raw currentQty with unitOfMeasure.
 */
export function getDisplayQty(product: ProductForDisplay): { qty: number; unit: string } {
  const rawQty = Number(product.currentQty)

  if (!product.shopUnit) {
    return { qty: rawQty, unit: product.unitOfMeasure }
  }

  const dimLength = product.dimLength ? Number(product.dimLength) : 0
  const dimWidth = product.dimWidth ? Number(product.dimWidth) : 0

  if (product.shopUnit === "sq ft" && dimLength > 0 && dimWidth > 0) {
    const areaPerUnit = toFeet(dimLength, product.dimLengthUnit || "ft") * toFeet(dimWidth, product.dimWidthUnit || "ft")
    return { qty: rawQty * areaPerUnit, unit: "sq ft" }
  }

  if ((product.shopUnit === "ft" || product.shopUnit === "in") && dimLength > 0) {
    const lengthInFt = toFeet(dimLength, product.dimLengthUnit || "ft")
    if (product.shopUnit === "in") {
      return { qty: rawQty * lengthInFt * 12, unit: "in" }
    }
    return { qty: rawQty * lengthInFt, unit: "ft" }
  }

  // Fallback: shopUnit is set but no matching dimensions — show raw qty with shopUnit label
  return { qty: rawQty, unit: product.shopUnit }
}

/**
 * Converts a quantity in shop units back to purchase units.
 * Reverse of getDisplayQty's multiplication.
 * Example: 5 ft of gasket (dimLength=100ft) → 0.05 rolls
 */
export function toPurchaseQty(shopQty: number, product: ProductForDisplay): number {
  if (!product.shopUnit) return shopQty

  const dimLength = product.dimLength ? Number(product.dimLength) : 0
  const dimWidth = product.dimWidth ? Number(product.dimWidth) : 0

  if (product.shopUnit === "sq ft" && dimLength > 0 && dimWidth > 0) {
    const areaPerUnit = toFeet(dimLength, product.dimLengthUnit || "ft") * toFeet(dimWidth, product.dimWidthUnit || "ft")
    return areaPerUnit > 0 ? shopQty / areaPerUnit : shopQty
  }

  if ((product.shopUnit === "ft" || product.shopUnit === "in") && dimLength > 0) {
    const lengthInFt = toFeet(dimLength, product.dimLengthUnit || "ft")
    const shopQtyInFt = product.shopUnit === "in" ? shopQty / 12 : shopQty
    return lengthInFt > 0 ? shopQtyInFt / lengthInFt : shopQty
  }

  return shopQty
}

/**
 * Returns the display quantity and unit for a reorder point.
 * Same conversion logic as getDisplayQty but for the reorder threshold.
 */
export function getDisplayReorder(product: ProductForDisplay & { reorderPoint: number | { toString(): string } }): { qty: number; unit: string } {
  return getDisplayQty({ ...product, currentQty: product.reorderPoint })
}
