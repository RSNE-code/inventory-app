/**
 * Unit conversion utilities — ported from web src/lib/units.ts.
 */

export const STANDARD_UNITS = [
  "ea", "pcs", "pc", "ct", "lbs", "lf", "sf", "cf",
  "gal", "qt", "oz", "ft", "in", "yd", "m", "cm",
  "mm", "kg", "g", "box", "case", "roll", "sheet",
  "bundle", "bag", "pail", "drum", "tube", "can",
] as const;

const UNIT_ALIASES: Record<string, string> = {
  each: "ea", piece: "pcs", pieces: "pcs", count: "ct",
  pound: "lbs", pounds: "lbs", lb: "lbs",
  "linear foot": "lf", "linear feet": "lf", "lin ft": "lf",
  "square foot": "sf", "square feet": "sf", "sq ft": "sf",
  foot: "ft", feet: "ft", inch: "in", inches: "in",
  gallon: "gal", gallons: "gal", quart: "qt", quarts: "qt",
  ounce: "oz", ounces: "oz",
  yard: "yd", yards: "yd",
  meter: "m", meters: "m",
  kilogram: "kg", kilograms: "kg", gram: "g", grams: "g",
  sheets: "sheet", rolls: "roll", boxes: "box",
  cases: "case", bundles: "bundle", bags: "bag",
  pails: "pail", drums: "drum", tubes: "tube", cans: "can",
};

export function normalizeUnit(unit: string): string {
  const lower = unit.toLowerCase().trim();
  return UNIT_ALIASES[lower] ?? lower;
}

interface ProductForDisplay {
  currentQty: number;
  unitOfMeasure?: string;
  unit?: string;
  shopUnit?: string | null;
  dimLength?: number | null;
  dimLengthUnit?: string | null;
  dimWidth?: number | null;
  dimWidthUnit?: string | null;
}

export function getDisplayQty(product: ProductForDisplay): { qty: number; unit: string } {
  const uom = product.unitOfMeasure ?? product.unit ?? "ea";
  const shopUnit = product.shopUnit;

  if (!shopUnit || shopUnit === uom) {
    return { qty: product.currentQty, unit: uom };
  }

  // Dimension-based conversion (e.g., sheets → LF based on panel width)
  if (product.dimLength && product.dimLengthUnit) {
    const multiplier = product.dimLength;
    return { qty: product.currentQty * multiplier, unit: shopUnit };
  }

  return { qty: product.currentQty, unit: shopUnit };
}

export function getDisplayReorder(
  product: ProductForDisplay & { reorderPoint: number }
): { qty: number; unit: string } {
  const uom = product.unitOfMeasure ?? product.unit ?? "ea";
  const shopUnit = product.shopUnit;

  if (!shopUnit || shopUnit === uom) {
    return { qty: product.reorderPoint, unit: uom };
  }

  if (product.dimLength && product.dimLengthUnit) {
    const multiplier = product.dimLength;
    return { qty: product.reorderPoint * multiplier, unit: shopUnit };
  }

  return { qty: product.reorderPoint, unit: shopUnit };
}

export function toPurchaseQty(shopQty: number, product: ProductForDisplay): number {
  const uom = product.unitOfMeasure ?? product.unit ?? "ea";
  const shopUnit = product.shopUnit;

  if (!shopUnit || shopUnit === uom) return shopQty;

  if (product.dimLength && product.dimLengthUnit) {
    return shopQty / product.dimLength;
  }

  return shopQty;
}
