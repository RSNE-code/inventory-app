// Panel utility functions for receiving breakout workflow
// Handles brand detection, catalog lookup, bundle conversion, sq ft calculation

export const PANEL_BRANDS: Record<
  string,
  { defaultWidth: number; widths: number[] }
> = {
  AWIP: { defaultWidth: 44, widths: [40, 44] },
  Falk: { defaultWidth: 44, widths: [40, 42, 44, 45, 46] },
  Kingspan: { defaultWidth: 45.38, widths: [24, 30, 36, 42, 45.38, 45.75] },
  MetlSpan: { defaultWidth: 44, widths: [30, 36, 42, 44] },
}

export const BUNDLE_SIZES: Record<number, number> = {
  2: 16,
  4: 11,
  5: 8,
}

export const PANEL_HEIGHTS = [
  8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 22, 24, 26, 28, 30, 32,
  34, 36, 38, 40,
]

export const COMMON_HEIGHTS = [8, 10, 12, 14, 16, 18, 20]

export const PANEL_THICKNESSES = [2, 4, 5]

export const PANEL_PROFILES = ["Mesa", "Light Mesa", "Flat"] as const
export type PanelProfile = (typeof PANEL_PROFILES)[number]

export const PANEL_COLORS: Record<string, string[]> = {
  MetlSpan: [
    "Regal White",
    "Warm White",
    "Surrey Beige",
    "Pearl Gray",
    "Royal Blue",
    "Slate Gray",
  ],
  Kingspan: [
    "Imperial White",
    "Regal White",
    "Driftwood",
    "Sandstone",
    "Surrey Beige",
  ],
  Falk: ["White", "Custom (see PO)"],
  AWIP: ["Imperial White", "Custom (see PO)"],
}

export const DEFAULT_INTERIOR_COLORS: Record<string, string> = {
  MetlSpan: "Igloo White",
  Kingspan: "Imperial White",
  Falk: "Dutch White",
  AWIP: "Imperial White",
}

// All known color names across all brands for PO text parsing
const ALL_COLOR_NAMES = [
  "regal white",
  "warm white",
  "imperial white",
  "igloo white",
  "dutch white",
  "polar white",
  "arctic white",
  "surrey beige",
  "pearl gray",
  "royal blue",
  "slate gray",
  "driftwood",
  "sandstone",
  "white",
]

// Canonical color name mapping (normalizes PO text to display name)
const COLOR_ALIASES: Record<string, string> = {
  "regal white": "Regal White",
  "warm white": "Warm White",
  "imperial white": "Imperial White",
  "igloo white": "Igloo White",
  "dutch white": "Dutch White",
  "polar white": "Polar White",
  "arctic white": "Arctic White",
  "surrey beige": "Surrey Beige",
  "pearl gray": "Pearl Gray",
  "royal blue": "Royal Blue",
  "slate gray": "Slate Gray",
  driftwood: "Driftwood",
  sandstone: "Sandstone",
  white: "White",
  "white/white": "White",
  "wht/wht": "White",
}

/**
 * Check if a product name matches the Insulated Metal Panel naming pattern
 */
export function isPanelProduct(productName: string): boolean {
  return /insulated\s+metal\s+panel/i.test(productName)
}

/**
 * Check if a PO line item is panel-related based on name/description
 */
export function isPanelLineItem(lineItem: {
  productName?: string | null
  description?: string | null
}): boolean {
  const text = `${lineItem.productName ?? ""} ${lineItem.description ?? ""}`.toLowerCase()
  return (
    /insulated\s*(metal\s*)?panel/i.test(text) ||
    /\bimp\b/i.test(text) ||
    (/panel/i.test(text) &&
      (/awip|falk|kingspan|metl[-\s]?span/i.test(text) ||
        /[245]["″]\s*(thick|panel|white|insul)/i.test(text)))
  )
}

/**
 * Extract panel context (brand, thickness, width, color) from PO line item text.
 * The PO description is the primary source — falls back to brand defaults.
 */
export function parsePanelContext(text: string): {
  brand?: string
  thickness?: number
  width?: number
  color?: string
  coating?: string
} {
  const t = text.toLowerCase()
  const result: {
    brand?: string
    thickness?: number
    width?: number
    color?: string
    coating?: string
  } = {}

  // Brand detection
  if (/awip|all\s*weather/i.test(t)) result.brand = "AWIP"
  else if (/falk/i.test(t)) result.brand = "Falk"
  else if (/kingspan/i.test(t)) result.brand = "Kingspan"
  else if (/metl[-\s]?span/i.test(t)) result.brand = "MetlSpan"

  // Thickness detection — look for patterns like 4", 5", 2"
  const thicknessMatch = t.match(/(\d+(?:\.\d+)?)\s*["″]\s*(?:thick|panel|insul|white|regal|imp|awip|falk|king|metl)/i)
    || t.match(/(\d+(?:\.\d+)?)\s*["″]/)
    || t.match(/(\d+(?:\.\d+)?)\s*(?:inch|in)\b/)
  if (thicknessMatch) {
    const val = parseFloat(thicknessMatch[1])
    // Only accept valid panel thicknesses (2-8 inches)
    if (val >= 2 && val <= 8) result.thickness = val
  }

  // Color detection — check PO text against all known color names
  // Sort by length descending so "Regal White" matches before "White"
  const sortedColors = ALL_COLOR_NAMES.sort((a, b) => b.length - a.length)
  for (const colorName of sortedColors) {
    if (t.includes(colorName)) {
      result.color = COLOR_ALIASES[colorName] || colorName
      break
    }
  }
  // Also check for "white/white" or "wht/wht" patterns
  if (!result.color) {
    const wwMatch = t.match(/wh(?:ite|t)\s*\/\s*wh(?:ite|t)/i)
    if (wwMatch) result.color = "White"
  }

  // Width detection — look for width patterns like 44", 40", 42", 45 3/8"
  // Avoid matching the thickness we already found
  const widthPatterns = [
    /(\d+)\s*(?:3\/8|3\/4)?\s*["″]\s*(?:wide|width|cover|coverage)/i,
    /(?:wide|width|cover|coverage)\s*[:=]?\s*(\d+(?:\.\d+)?)\s*["″]?/i,
    /(\d+(?:\.\d+)?)\s*["″]\s*w\b/i,
  ]
  for (const pattern of widthPatterns) {
    const match = t.match(pattern)
    if (match) {
      let val = parseFloat(match[1])
      // Handle fractional widths: "45 3/8" → 45.375
      if (/3\/8/.test(match[0])) val = Math.floor(val) + 0.375
      else if (/3\/4/.test(match[0])) val = Math.floor(val) + 0.75
      // Only accept realistic panel widths (24-48 inches)
      if (val >= 24 && val <= 48 && val !== result.thickness) {
        result.width = val
        break
      }
    }
  }

  // Coating detection
  if (/pvdf|fluro/i.test(t)) result.coating = "PVDF"
  else if (/smp|silicone/i.test(t)) result.coating = "SMP"
  else if (/polyester|pe\b/i.test(t)) result.coating = "Polyester"

  // Fall back to brand defaults for width and color
  if (!result.width && result.brand) {
    result.width = PANEL_BRANDS[result.brand]?.defaultWidth
  }
  if (!result.color && result.brand) {
    result.color = PANEL_COLORS[result.brand]?.[0]
  }

  return result
}

/**
 * Build the exact catalog product name for a panel.
 * Must match the naming pattern in knowify-catalog.json:
 * "Insulated Metal Panel ({Brand})-{Height}'-{Width}-{Thickness}"
 */
export function buildPanelProductName(
  brand: string,
  height: number,
  width: number,
  thickness: number
): string {
  return `Insulated Metal Panel (${brand})-${height}'-${width}-${thickness}`
}

/**
 * Convert bundle count to individual panel count
 */
export function bundleToPanels(bundles: number, thickness: number): number {
  const panelsPerBundle = BUNDLE_SIZES[thickness]
  if (!panelsPerBundle) return bundles // fallback: treat as panels
  return Math.round(bundles * panelsPerBundle)
}

/**
 * How many BOM-cut-length panels can be extracted from one stock panel.
 * e.g. 16' stock ÷ 8' cut = 2 cuts per panel.
 */
export function cutsPerStockPanel(stockHeightFt: number, cutLengthFt: number): number {
  if (cutLengthFt <= 0) return 0
  return Math.floor(stockHeightFt / cutLengthFt)
}

/**
 * Calculate square footage of a single panel
 * height in feet, width in inches
 */
export function panelSqFt(heightFt: number, widthInches: number): number {
  return heightFt * (widthInches / 12)
}

/**
 * Calculate total square footage for a set of breakout rows
 */
export function totalSqFt(
  rows: Array<{ height: number; quantity: number }>,
  widthInches: number
): number {
  return rows.reduce(
    (sum, row) => sum + row.quantity * panelSqFt(row.height, widthInches),
    0
  )
}
