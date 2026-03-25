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

  // Count how many item tokens match template tokens
  let matchedTokens = 0
  for (const token of itemTokens) {
    if (templateTokens.some((tt) => tt.includes(token) || token.includes(tt))) {
      matchedTokens++
    }
  }

  const coverageScore = matchedTokens / itemTokens.length

  // Dimension matching boost: if the item has dimension-like tokens (numbers)
  // that match the template's dimension tokens, boost confidence
  const itemDimTokens = itemTokens.filter((t) => /^\d+$/.test(t))
  const templateDimTokens = templateTokens.filter((t) => /^\d+$/.test(t))
  let dimBoost = 0
  if (itemDimTokens.length > 0 && templateDimTokens.length > 0) {
    const dimMatches = itemDimTokens.filter((d) => templateDimTokens.includes(d)).length
    dimBoost = dimMatches > 0 ? 0.15 * (dimMatches / itemDimTokens.length) : 0
  }

  // Type keyword boost: if the item mentions "door", "panel", "ramp", "slider"
  // and the template type matches
  let typeBoost = 0
  const typeKeywords: Record<string, string[]> = {
    DOOR: ["door", "swing", "slider", "sliding"],
    FLOOR_PANEL: ["floor", "panel"],
    WALL_PANEL: ["wall", "panel"],
    RAMP: ["ramp"],
  }
  const keywords = typeKeywords[template.type] || []
  if (keywords.some((kw) => itemTokens.includes(kw))) {
    typeBoost = 0.10
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
