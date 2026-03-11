import { prisma } from "@/lib/db"
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

export async function matchItemsToCatalog(
  parsedItems: ParsedLineItem[]
): Promise<CatalogMatch[]> {
  // Load all active products for matching
  const products = await prisma.product.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      sku: true,
      unitOfMeasure: true,
      currentQty: true,
      tier: true,
      category: { select: { name: true } },
      lastCost: true,
      avgCost: true,
      reorderPoint: true,
      dimLength: true,
      dimLengthUnit: true,
      dimWidth: true,
      dimWidthUnit: true,
    },
  })

  return parsedItems.map((item) => matchSingleItem(item, products))
}

function matchSingleItem(
  item: ParsedLineItem,
  products: CatalogProduct[]
): CatalogMatch {
  const scored = products.map((product) => ({
    product,
    score: calculateMatchScore(item, product),
  }))

  scored.sort((a, b) => b.score - a.score)

  const bestMatch = scored[0]
  const threshold = 0.4

  if (bestMatch && bestMatch.score >= threshold) {
    const alternatives = scored
      .slice(1, 4)
      .filter((s) => s.score >= threshold)
      .map((s) => ({
        id: s.product.id,
        name: s.product.name,
        matchConfidence: s.score,
      }))

    return {
      parsedItem: item,
      matchedProduct: {
        id: bestMatch.product.id,
        name: bestMatch.product.name,
        sku: bestMatch.product.sku,
        unitOfMeasure: bestMatch.product.unitOfMeasure,
        currentQty: Number(bestMatch.product.currentQty),
        tier: bestMatch.product.tier,
        categoryName: bestMatch.product.category.name,
        lastCost: Number(bestMatch.product.lastCost ?? 0),
        avgCost: Number(bestMatch.product.avgCost ?? 0),
        reorderPoint: Number(bestMatch.product.reorderPoint ?? 0),
        dimLength: bestMatch.product.dimLength ? Number(bestMatch.product.dimLength) : null,
        dimLengthUnit: bestMatch.product.dimLengthUnit,
        dimWidth: bestMatch.product.dimWidth ? Number(bestMatch.product.dimWidth) : null,
        dimWidthUnit: bestMatch.product.dimWidthUnit,
      },
      matchConfidence: bestMatch.score,
      isNonCatalog: false,
      alternativeMatches: alternatives.length > 0 ? alternatives : undefined,
    }
  }

  return {
    parsedItem: item,
    matchedProduct: null,
    matchConfidence: 0,
    isNonCatalog: true,
  }
}

function calculateMatchScore(
  item: ParsedLineItem,
  product: CatalogProduct
): number {
  const itemName = normalize(item.name)
  const productName = normalize(product.name)

  // Exact match
  if (itemName === productName) return 1.0

  // Check SKU match
  if (product.sku && normalize(product.sku) === itemName) return 0.95

  // Token-based similarity
  const itemTokens = tokenize(itemName)
  const productTokens = tokenize(productName)

  if (itemTokens.length === 0 || productTokens.length === 0) return 0

  // Count matching tokens
  let matchedTokens = 0
  for (const token of itemTokens) {
    if (productTokens.some((pt) => pt.includes(token) || token.includes(pt))) {
      matchedTokens++
    }
  }

  const tokenScore = matchedTokens / Math.max(itemTokens.length, productTokens.length)

  // Boost if category matches
  let categoryBoost = 0
  if (item.category && normalize(item.category) === normalize(product.category.name)) {
    categoryBoost = 0.15
  }

  // Boost for abbreviation matches (e.g., "IMP" matches "Insulated Metal Panel")
  const abbrScore = checkAbbreviationMatch(itemTokens, productTokens)

  return Math.min(1.0, tokenScore + categoryBoost + abbrScore)
}

function normalize(text: string | undefined | null): string {
  if (!text) return ""
  return text
    .toLowerCase()
    .replace(/['"]/g, "") // remove quotes (inch/foot marks)
    .replace(/\s+/g, " ")
    .trim()
}

function tokenize(text: string): string[] {
  return text
    .split(/[\s\/\-_,]+/)
    .filter((t) => t.length > 0)
}

// Common abbreviations in construction/refrigeration
const ABBREVIATIONS: Record<string, string[]> = {
  imp: ["insulated", "metal", "panel"],
  w: ["white"],
  ss: ["stainless", "steel"],
  galv: ["galvalume", "galvanized"],
  alum: ["aluminum"],
  frp: ["fiberglass", "reinforced", "panel"],
  lf: ["linear", "ft", "feet", "foot"],
  sf: ["square", "ft", "feet", "foot"],
  ea: ["each"],
  pcs: ["pieces"],
  qty: ["quantity"],
}

function checkAbbreviationMatch(
  itemTokens: string[],
  productTokens: string[]
): number {
  let abbrMatches = 0
  for (const token of itemTokens) {
    const expansion = ABBREVIATIONS[token]
    if (expansion) {
      const expandedMatches = expansion.filter((e) =>
        productTokens.some((pt) => pt.startsWith(e))
      )
      if (expandedMatches.length > 0) abbrMatches++
    }
  }
  return abbrMatches > 0 ? 0.1 * abbrMatches : 0
}
