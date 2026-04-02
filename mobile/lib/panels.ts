/**
 * Panel catalog data — brands, sizes, colors.
 * Ported from web src/lib/panels.ts.
 */

export const PANEL_BRANDS = ["AWIP", "Falk", "Kingspan", "MetlSpan"] as const;

export const BUNDLE_SIZES: Record<number, number> = {
  2: 16,
  4: 11,
  5: 8,
};

export const PANEL_HEIGHTS = [8, 9, 10, 11, 12, 14, 16, 18, 20] as const;
export const COMMON_HEIGHTS = [8, 10, 12] as const;
export const PANEL_THICKNESSES = ["2\"", "3\"", "4\"", "5\"", "6\""] as const;
export const PANEL_PROFILES = ["Flat", "Stucco", "Ribbed"] as const;

export const PANEL_COLORS: Record<string, string[]> = {
  AWIP: ["White", "Bone White", "Beige"],
  Falk: ["White", "Bone", "Sandstone"],
  Kingspan: ["White", "Igloo White", "Bone"],
  MetlSpan: ["White", "Bone", "Light Stone"],
};

export const DEFAULT_INTERIOR_COLORS: Record<string, string> = {
  AWIP: "White",
  Falk: "White",
  Kingspan: "Igloo White",
  MetlSpan: "White",
};

export function isPanelProduct(productName: string): boolean {
  const lower = productName.toLowerCase();
  return (
    lower.includes("insulated metal panel") ||
    lower.includes("imp") ||
    PANEL_BRANDS.some((b) => lower.includes(b.toLowerCase()))
  );
}

export function buildPanelProductName(
  brand: string,
  heightFt: number,
  widthIn: number,
  thickness: string
): string {
  return `Insulated Metal Panel (${brand})-${heightFt}'-${widthIn}-${thickness}`;
}

export function bundleToPanels(bundles: number, thicknessInches: number): number {
  return bundles * (BUNDLE_SIZES[thicknessInches] ?? 10);
}

export function panelSqFt(heightFt: number, widthInches: number): number {
  return heightFt * (widthInches / 12);
}
