/**
 * Search normalization for trade shorthand.
 * Converts worker input like "4x8 O63 diamond plate" into tokens
 * that match catalog entries like "Diamond Plate .063 4' x 8'".
 */

export const ABBREVIATION_MAP: Record<string, string> = {
  // Gauge/thickness (sheet metal)
  o63: ".063", o40: ".040", o90: ".090", o32: ".032", o24: ".024",
  o125: ".125", o80: ".080", o50: ".050",
  // Materials
  ss: "stainless steel", galv: "galvanized", alum: "aluminum",
  dp: "diamond plate", frp: "fiberglass reinforced panel",
  ply: "plywood", poly: "polyethylene",
  // Panels
  imp: "insulated metal panel", ww: "white white",
  // Trim / metal work
  oc: "outside corner", ic: "inside corner",
  tws: "trim wall steel", bc: "base cover",
  fb: "flat batten",
  // Sealants / adhesives / foam
  fp: "froth pak", fsi: "fsi",
  // Hardware
  hc: "heater cable", hw: "hardware",
  // Fasteners
  tek: "tek", sd: "self drilling",
  // Units
  lf: "linear feet", sf: "square feet", ea: "each",
  pcs: "pieces", qty: "quantity", bndl: "bundle",
  // Dimensions
  ft: "ft", in: "in",
  // Color shorthand
  wht: "white", blk: "black", clr: "clear",
  // Size/measurement
  ga: "gauge", thk: "thick",
  // Common product shorthand
  pvc: "pvc", abs: "abs",
  gsk: "gasket", caulk: "caulk",
}

/**
 * Normalize a search string into tokens suitable for database matching.
 *
 * 1. Lowercase
 * 2. Strip apostrophes/foot/inch marks
 * 3. Split "4x8" → "4 8" (x between digits only)
 * 4. Strip special chars except dots and hyphens
 * 5. Expand trade abbreviations
 * 6. Filter empties and single-char non-digits
 */
export function normalizeSearchTokens(input: string): string[] {
  let normalized = input.toLowerCase()

  // Strip apostrophes, foot/inch marks, prime symbols
  normalized = normalized.replace(/[''′`"″"]/g, "")

  // Split "4x8" → "4 8" (x between digits only, not words like "box")
  normalized = normalized.replace(/(\d)x(\d)/g, "$1 $2")

  // Strip special chars except dots, hyphens, and word chars
  normalized = normalized.replace(/[^\w\s.\-]/g, " ")

  // Split into tokens
  const rawTokens = normalized.split(/\s+/).filter(Boolean)

  // Expand abbreviations
  const expanded: string[] = []
  for (const token of rawTokens) {
    const mapped = ABBREVIATION_MAP[token]
    if (mapped) {
      // Some expansions are multi-word (e.g., "ss" → "stainless steel")
      expanded.push(...mapped.split(" "))
    } else {
      expanded.push(token)
    }
  }

  // Filter out empty tokens and single-char non-digit tokens
  return expanded.filter(
    (t) => t.length > 1 || (t.length === 1 && /\d/.test(t))
  )
}

/**
 * Build a Prisma-compatible AND query from normalized tokens.
 * Each token must match either name or sku (case-insensitive).
 */
export function buildTokenSearch(tokens: string[]) {
  return tokens.map((token) => ({
    OR: [
      { name: { contains: token, mode: "insensitive" as const } },
      { sku: { contains: token, mode: "insensitive" as const } },
    ],
  }))
}
