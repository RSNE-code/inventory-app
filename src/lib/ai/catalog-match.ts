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
  isAssembly: boolean
  assemblyTemplateId: string | null
}

// Known door/panel supplier names — if these appear in the parsed text,
// the item is a supplier product, not an RSNE assembly.
const SUPPLIER_NAMES = [
  "jamison", "kolpak", "bally", "chase", "nor-lake", "norlake",
  "master-bilt", "masterbilt", "amerikooler", "walk-in", "hussmann",
  "tyler", "zero zone", "hill phoenix",
]

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
      isAssembly: product.isAssembly,
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
  // Assembly products are now real Product records — single query gets everything
  const products = await prisma.product.findMany({
    where: { isActive: true },
    select: {
      id: true, name: true, sku: true, unitOfMeasure: true,
      currentQty: true, tier: true,
      category: { select: { name: true } },
      lastCost: true, avgCost: true, reorderPoint: true,
      dimLength: true, dimLengthUnit: true,
      dimWidth: true, dimWidthUnit: true,
      isAssembly: true, assemblyTemplateId: true,
    },
  })

  return Promise.all(
    parsedItems.map((item) => matchSingleItem(item, products, userId))
  )
}

// ─── Match a single item ───

async function matchSingleItem(
  item: ParsedLineItem,
  products: CatalogProduct[],
  userId?: string
): Promise<CatalogMatch> {
  // 1. Check match history first — user corrections are the strongest signal
  if (userId) {
    const historyMatch = await checkMatchHistory(item.name, userId, products)
    if (historyMatch) {
      return buildProductMatch(historyMatch, item, 0.98, "auto")
    }
  }

  // 2. Check if item mentions a known supplier — suppress assembly product matches
  const itemNameLower = item.name.toLowerCase()
  const mentionsSupplier = SUPPLIER_NAMES.some((s) => itemNameLower.includes(s))

  // 3. Score all products (assembly products get synonym/dimension boosts)
  const scored = products
    .filter((product) => {
      // Skip assembly products when a supplier name is mentioned
      if (mentionsSupplier && product.isAssembly) return false
      return true
    })
    .map((product) => ({
      product,
      score: calculateMatchScore(item, product),
    }))

  scored.sort((a, b) => b.score - a.score)

  const bestProduct = scored[0]
  const FLOOR_THRESHOLD = 0.40

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
    if (product.isAssembly) {
      // Assembly products get synonym-aware matching
      if (productTokens.some((pt) => assemblyTokenMatch(token, pt))) {
        matchedTokens++
      }
    } else {
      if (productTokens.some((pt) => pt.includes(token) || token.includes(pt))) {
        matchedTokens++
      }
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

  // Assembly-specific boosts (dimension proximity + type keywords)
  let assemblyBoost = 0
  if (product.isAssembly) {
    assemblyBoost = calculateAssemblyBoost(itemTokens, productTokens)
  }

  return Math.min(1.0, tokenScore + categoryBoost + skuBoost + assemblyBoost)
}

// ─── Assembly-specific scoring boosts ───

function assemblyTokenMatch(itemToken: string, productToken: string): boolean {
  // Direct substring match
  if (productToken.includes(itemToken) || itemToken.includes(productToken)) return true
  // Synonym match
  const synonyms = ASSEMBLY_SYNONYMS[productToken]
  if (synonyms && synonyms.includes(itemToken)) return true
  const itemSynonyms = ASSEMBLY_SYNONYMS[itemToken]
  if (itemSynonyms && itemSynonyms.includes(productToken)) return true
  return false
}

function calculateAssemblyBoost(itemTokens: string[], productTokens: string[]): number {
  let boost = 0

  // Dimension proximity: allow approximate matches (6'6" ≈ 7')
  const itemDimTokens = itemTokens.filter((t) => /^\d+$/.test(t))
  const productDimTokens = productTokens.filter((t) => /^\d+$/.test(t))

  if (itemDimTokens.length > 0 && productDimTokens.length > 0) {
    const exactDimMatches = itemDimTokens.filter((d) => productDimTokens.includes(d)).length
    if (exactDimMatches > 0) {
      boost = 0.15 * (exactDimMatches / itemDimTokens.length)
    }
    const itemNums = itemDimTokens.map((t) => parseInt(t, 10))
    const productNums = productDimTokens.map((t) => parseInt(t, 10))
    for (let i = 0; i < itemNums.length; i++) {
      const standaloneFt = itemNums[i] * 12
      for (const pNum of productNums) {
        const productIn = pNum * 12
        if (Math.abs(standaloneFt - productIn) <= 12 && standaloneFt !== productIn) {
          boost = Math.max(boost, 0.10)
        }
      }
      if (i + 1 < itemNums.length && itemNums[i + 1] <= 11) {
        const feetPlusInches = itemNums[i] * 12 + itemNums[i + 1]
        for (const pNum of productNums) {
          const productIn = pNum * 12
          if (Math.abs(feetPlusInches - productIn) <= 12) {
            boost = Math.max(boost, 0.15)
          }
        }
      }
    }
  }

  // Type keyword boost
  const typeKeywords = ["door", "swing", "slider", "sliding", "slide", "hinged", "hinge", "dr",
    "floor", "panel", "flr", "wall", "wl", "ramp", "loading"]
  if (typeKeywords.some((kw) => itemTokens.includes(kw))) {
    boost += 0.10
  }

  return boost
}

// ─── Text utilities ───

function normalize(text: string | undefined | null): string {
  if (!text) return ""
  return text
    .toLowerCase()
    .replace(/[''′`"″"]/g, "") // remove all quote/apostrophe variants
    .replace(/(\d)\s*x\s*(\d)/g, "$1 $2") // split dimension patterns: "5x7" → "5 7"
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
