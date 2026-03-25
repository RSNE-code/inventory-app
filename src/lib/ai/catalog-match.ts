import { prisma } from "@/lib/db"
import { ABBREVIATION_MAP, normalizeSearchTokens } from "@/lib/search"
import type { ParsedLineItem, CatalogMatch } from "./types"

interface CatalogProduct {
  id: string
  name: string
  sku: string | null
  unitOfMeasure: string
  currentQty: number | { toString(): string }
  tier: string
  category: { name: string }
  lastCost: number | { toString(): string } | null
  avgCost: number | { toString(): string } | null
  reorderPoint: number | { toString(): string }
  dimLength: number | { toString(): string } | null
  dimLengthUnit: string | null
  dimWidth: number | { toString(): string } | null
  dimWidthUnit: string | null
}

interface AssemblyTemplateRecord {
  id: string
  name: string
  type: string
  description: string | null
}

// Known door/panel supplier names — if these appear in the parsed text,
// the item is a supplier product, not an RSNE assembly.
const SUPPLIER_NAMES = [
  "jamison", "kolpak", "bally", "chase", "nor-lake", "norlake",
  "master-bilt", "masterbilt", "amerikooler", "walk-in", "hussmann",
  "tyler", "zero zone", "hill phoenix",
]

// ─── Confidence tiers ───

function getMatchTier(confidence: number): "auto" | "suggested" | "flagged" | "none" {
  if (confidence >= 0.85) return "auto"
  if (confidence >= 0.60) return "suggested"
  if (confidence >= 0.40) return "flagged"
  return "none"
}

// ─── Product → CatalogMatch helper ───

function buildProductMatch(
  product: CatalogProduct,
  item: ParsedLineItem,
  confidence: number,
  tier: "auto" | "suggested" | "flagged" | "none",
  alternatives?: { id: string; name: string; matchConfidence: number }[]
): CatalogMatch {
  return {
    parsedItem: item,
    matchedProduct: {
      id: product.id,
      name: product.name,
      sku: product.sku,
      unitOfMeasure: product.unitOfMeasure,
      currentQty: Number(product.currentQty),
      tier: product.tier,
      categoryName: product.category.name,
      lastCost: Number(product.lastCost ?? 0),
      avgCost: Number(product.avgCost ?? 0),
      reorderPoint: Number(product.reorderPoint ?? 0),
      dimLength: product.dimLength ? Number(product.dimLength) : null,
      dimLengthUnit: product.dimLengthUnit,
      dimWidth: product.dimWidth ? Number(product.dimWidth) : null,
      dimWidthUnit: product.dimWidthUnit,
    },
    matchConfidence: confidence,
    matchTier: tier,
    isNonCatalog: false,
    alternativeMatches: alternatives && alternatives.length > 0 ? alternatives : undefined,
  }
}

// ─── Main entry point ───

export async function matchItemsToCatalog(
  parsedItems: ParsedLineItem[],
  userId?: string
): Promise<CatalogMatch[]> {
  const [products, assemblyTemplates] = await Promise.all([
    prisma.product.findMany({
      where: { isActive: true },
      select: {
        id: true, name: true, sku: true, unitOfMeasure: true,
        currentQty: true, tier: true,
        category: { select: { name: true } },
        lastCost: true, avgCost: true, reorderPoint: true,
        dimLength: true, dimLengthUnit: true,
        dimWidth: true, dimWidthUnit: true,
      },
    }),
    prisma.assemblyTemplate.findMany({
      where: { isActive: true },
      select: { id: true, name: true, type: true, description: true },
    }),
  ])

  return Promise.all(
    parsedItems.map((item) => matchSingleItem(item, products, assemblyTemplates, userId))
  )
}

// ─── Match a single item ───

async function matchSingleItem(
  item: ParsedLineItem,
  products: CatalogProduct[],
  assemblyTemplates: AssemblyTemplateRecord[],
  userId?: string
): Promise<CatalogMatch> {
  // 1. Check match history first — user corrections are the strongest signal
  if (userId) {
    const historyMatch = await checkMatchHistory(item.name, userId, products)
    if (historyMatch) {
      return buildProductMatch(historyMatch, item, 0.98, "auto")
    }
  }

  // 2. Check if item mentions a known supplier — if so, skip assembly templates
  const itemNameLower = item.name.toLowerCase()
  const mentionsSupplier = SUPPLIER_NAMES.some((s) => itemNameLower.includes(s))

  // 3. Score against assembly templates (unless supplier is mentioned)
  let bestAssemblyMatch: { template: AssemblyTemplateRecord; score: number } | null = null
  if (!mentionsSupplier && assemblyTemplates.length > 0) {
    const assemblyScored = assemblyTemplates.map((template) => ({
      template,
      score: calculateAssemblyMatchScore(item, template),
    }))
    assemblyScored.sort((a, b) => b.score - a.score)
    if (assemblyScored[0] && assemblyScored[0].score >= 0.50) {
      bestAssemblyMatch = assemblyScored[0]
    }
  }

  // 4. Fuzzy match against catalog products
  const scored = products.map((product) => ({
    product,
    score: calculateMatchScore(item, product),
  }))

  scored.sort((a, b) => b.score - a.score)

  const bestProduct = scored[0]
  const FLOOR_THRESHOLD = 0.40

  // 5. Prefer assembly template if it scores higher than the best product match
  // Assembly templates get a small boost since "cooler door 5x7" is almost
  // certainly an RSNE fab item, not a random catalog product
  if (bestAssemblyMatch && (!bestProduct || bestAssemblyMatch.score + 0.10 >= bestProduct.score)) {
    const t = bestAssemblyMatch.template
    const typeLabel = assemblyTypeLabel(t.type)
    return {
      // Override parsedItem name/category with template info so the BOM
      // confirmation flow picks up the correct assembly name and type
      parsedItem: {
        ...item,
        name: t.name,
        category: typeLabel,
        unitOfMeasure: "each",
      },
      matchedProduct: null,
      matchConfidence: bestAssemblyMatch.score,
      matchTier: getMatchTier(bestAssemblyMatch.score),
      isNonCatalog: true,
      assemblyTemplateId: t.id,
      // Provide alternatives from product matches for user to override
      alternativeMatches: scored
        .slice(0, 3)
        .filter((s) => s.score >= FLOOR_THRESHOLD)
        .map((s) => ({
          id: s.product.id,
          name: s.product.name,
          matchConfidence: s.score,
        })),
    }
  }

  if (bestProduct && bestProduct.score >= FLOOR_THRESHOLD) {
    const tier = getMatchTier(bestProduct.score)
    const alternatives = scored
      .slice(1, 4)
      .filter((s) => s.score >= FLOOR_THRESHOLD)
      .map((s) => ({
        id: s.product.id,
        name: s.product.name,
        matchConfidence: s.score,
      }))

    return buildProductMatch(bestProduct.product, item, bestProduct.score, tier, alternatives)
  }

  return {
    parsedItem: item,
    matchedProduct: null,
    matchConfidence: bestProduct?.score || 0,
    matchTier: "none",
    isNonCatalog: true,
  }
}

function assemblyTypeLabel(type: string): string {
  switch (type) {
    case "DOOR": return "Door"
    case "FLOOR_PANEL": return "Floor Panel"
    case "WALL_PANEL": return "Wall Panel"
    case "RAMP": return "Ramp"
    default: return "Assembly"
  }
}

// ─── Assembly template scoring ───

// Synonyms for assembly matching — words that mean the same thing
// in RSNE door/panel context
const ASSEMBLY_SYNONYMS: Record<string, string[]> = {
  "slider": ["sliding", "slide"],
  "sliding": ["slider", "slide"],
  "door": ["dr"],
  "cooler": ["clr", "walk-in", "walkin"],
  "freezer": ["frzr", "frz"],
  "exterior": ["ext", "outside"],
  "panel": ["pnl"],
  "floor": ["flr"],
  "wall": ["wl"],
  "ramp": ["loading"],
}

function assemblyTokenMatch(itemToken: string, templateToken: string): boolean {
  // Direct substring match
  if (templateToken.includes(itemToken) || itemToken.includes(templateToken)) return true
  // Synonym match
  const synonyms = ASSEMBLY_SYNONYMS[templateToken]
  if (synonyms && synonyms.includes(itemToken)) return true
  const itemSynonyms = ASSEMBLY_SYNONYMS[itemToken]
  if (itemSynonyms && itemSynonyms.includes(templateToken)) return true
  return false
}

// Convert dimension tokens to inches for approximate matching.
// "6" in context of feet = 72", "7" = 84". 6'6" parsed as ["6","6"] = ~78"
function parseDimInches(tokens: string[]): number[] {
  return tokens.map((t) => parseInt(t, 10) * 12).filter((n) => !isNaN(n))
}

function calculateAssemblyMatchScore(
  item: ParsedLineItem,
  template: AssemblyTemplateRecord
): number {
  const itemName = normalize(item.name)
  const templateName = normalize(template.name)

  // Exact match
  if (itemName === templateName) return 1.0

  const itemTokens = expandTokens(tokenize(itemName))
  const templateTokens = tokenize(templateName)

  if (itemTokens.length === 0 || templateTokens.length === 0) return 0

  // Count how many item tokens match template tokens (with synonyms)
  let matchedTokens = 0
  for (const token of itemTokens) {
    if (templateTokens.some((tt) => assemblyTokenMatch(token, tt))) {
      matchedTokens++
    }
  }

  const coverageScore = matchedTokens / itemTokens.length

  // Dimension proximity: allow approximate matches (6'6" ≈ 7')
  // Extract dimension-like tokens (numbers) from both sides
  const itemDimTokens = itemTokens.filter((t) => /^\d+$/.test(t))
  const templateDimTokens = templateTokens.filter((t) => /^\d+$/.test(t))
  let dimBoost = 0
  if (itemDimTokens.length > 0 && templateDimTokens.length > 0) {
    // Check exact dimension matches first
    const exactDimMatches = itemDimTokens.filter((d) => templateDimTokens.includes(d)).length
    if (exactDimMatches > 0) {
      dimBoost = 0.15 * (exactDimMatches / itemDimTokens.length)
    }
    // For non-exact matches, check nearby dimensions.
    // Door/panel dimensions are typically WxH in feet. When the AI parses
    // "5' x 6'-6"" the tokens are ["5","6","6"]. We need to check if any
    // pair of item dimensions (treated as feet+inches) is close to a template dim.
    // e.g., 6 feet + 6 inches = 78" ≈ 84" (7 feet) → close match
    const itemNums = itemDimTokens.map((t) => parseInt(t, 10))
    const templateNums = templateDimTokens.map((t) => parseInt(t, 10))
    for (let i = 0; i < itemNums.length; i++) {
      // Try this number as standalone feet
      const standaloneFt = itemNums[i] * 12
      for (const tNum of templateNums) {
        const templateIn = tNum * 12
        if (Math.abs(standaloneFt - templateIn) <= 12 && standaloneFt !== templateIn) {
          dimBoost = Math.max(dimBoost, 0.10)
        }
      }
      // Try combining with next number as feet+inches (e.g., 6,6 → 78")
      if (i + 1 < itemNums.length && itemNums[i + 1] <= 11) {
        const feetPlusInches = itemNums[i] * 12 + itemNums[i + 1]
        for (const tNum of templateNums) {
          const templateIn = tNum * 12
          if (Math.abs(feetPlusInches - templateIn) <= 12) {
            dimBoost = Math.max(dimBoost, 0.15)
          }
        }
      }
    }
  }

  // Type keyword boost: if the item mentions door/panel/ramp-related words
  // and the template type matches
  let typeBoost = 0
  const typeKeywords: Record<string, string[]> = {
    DOOR: ["door", "swing", "slider", "sliding", "slide", "hinged", "hinge", "dr"],
    FLOOR_PANEL: ["floor", "panel", "flr"],
    WALL_PANEL: ["wall", "panel", "wl"],
    RAMP: ["ramp", "loading"],
  }
  const keywords = typeKeywords[template.type] || []
  if (keywords.some((kw) => itemTokens.includes(kw))) {
    typeBoost = 0.10
  }

  // If the item is clearly a door/panel type (has type keywords) but coverage
  // is low because template uses different terminology (e.g., "sliding door"
  // vs "cooler slider"), give a bonus for the type match
  if (typeBoost > 0 && coverageScore < 0.40) {
    // The item is definitely talking about this type of assembly
    // even if the exact words don't match well
    typeBoost = 0.20
  }

  return Math.min(1.0, coverageScore + dimBoost + typeBoost)
}

// ─── Match history lookup ───

async function checkMatchHistory(
  itemName: string,
  userId: string,
  products: CatalogProduct[]
): Promise<CatalogProduct | null> {
  const normalizedText = normalizeSearchTokens(itemName).join(" ")
  if (!normalizedText) return null

  try {
    const history = await prisma.matchHistory.findFirst({
      where: {
        normalizedText: normalizedText,
        confirmed: true,
        productId: { not: null },
      },
      orderBy: { usageCount: "desc" },
      select: { productId: true },
    })

    if (history?.productId) {
      return products.find((p) => p.id === history.productId) || null
    }
  } catch {
    // Match history lookup is best-effort — don't block matching on DB errors
  }

  return null
}

// ─── Scoring ───

function calculateMatchScore(
  item: ParsedLineItem,
  product: CatalogProduct
): number {
  const itemName = normalize(item.name)
  const productName = normalize(product.name)

  // Exact match
  if (itemName === productName) return 1.0

  // SKU match
  if (product.sku && normalize(product.sku) === itemName) return 0.95

  // Token-based similarity with abbreviation expansion
  const itemTokens = expandTokens(tokenize(itemName))
  const productTokens = tokenize(productName)

  if (itemTokens.length === 0 || productTokens.length === 0) return 0

  // Count how many ITEM tokens match something in the product
  let matchedTokens = 0
  for (const token of itemTokens) {
    if (productTokens.some((pt) => pt.includes(token) || token.includes(pt))) {
      matchedTokens++
    }
  }

  // Item-coverage scoring: how much of what the user typed was found in the product name
  const coverageScore = matchedTokens / itemTokens.length

  // Small penalty if product name is much longer (reduces false positives on short searches)
  const excessTokens = Math.max(0, productTokens.length - itemTokens.length - 2)
  const lengthPenalty = excessTokens > 0
    ? 1 - (0.08 * excessTokens / productTokens.length)
    : 1

  const tokenScore = coverageScore * lengthPenalty

  // Category boost
  let categoryBoost = 0
  if (item.category && normalize(item.category) === normalize(product.category.name)) {
    categoryBoost = 0.15
  }

  // SKU partial match boost (e.g., "P03" matching SKU "P03.063H22DT-96-48")
  let skuBoost = 0
  if (product.sku) {
    const skuNorm = normalize(product.sku)
    const skuMatchCount = itemTokens.filter((t) => skuNorm.includes(t)).length
    if (skuMatchCount > 0) skuBoost = 0.05 * skuMatchCount
  }

  return Math.min(1.0, tokenScore + categoryBoost + skuBoost)
}

// ─── Text utilities ───

function normalize(text: string | undefined | null): string {
  if (!text) return ""
  return text
    .toLowerCase()
    .replace(/[''′`"″"]/g, "") // remove all quote/apostrophe variants
    .replace(/\s+/g, " ")
    .trim()
}

function tokenize(text: string): string[] {
  return text
    .split(/[\s\/\-_,()]+/)
    .filter((t) => t.length > 0)
}

/**
 * Expand tokens using the shared abbreviation map.
 * "o63" → ".063", "ss" → "stainless", "steel", etc.
 */
function expandTokens(tokens: string[]): string[] {
  const expanded: string[] = []
  for (const token of tokens) {
    const mapped = ABBREVIATION_MAP[token]
    if (mapped) {
      expanded.push(...mapped.split(" "))
    } else {
      expanded.push(token)
    }
  }
  return expanded
}
