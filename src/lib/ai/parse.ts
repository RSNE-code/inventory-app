import { generateText, streamObject } from "ai"
import { anthropic } from "@ai-sdk/anthropic"
import { z } from "zod"
import { prisma } from "@/lib/db"
import { isPanelProduct, isPanelLineItem } from "@/lib/panels"
import type { ParsedLineItem, CatalogMatch } from "./types"

const MODEL_FAST = anthropic("claude-haiku-4-5-20251001")
const MODEL_VISION = anthropic("claude-sonnet-4-6")

// ─── Load context data for AI matching ───

export interface IndexedCatalog {
  text: string                    // Compact catalog string for the prompt (short numeric IDs)
  indexToId: Map<number, string>  // Map short index back to real UUID
}

async function loadIndexedCatalog(): Promise<IndexedCatalog> {
  const products = await prisma.product.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      sku: true,
    },
    orderBy: { name: "asc" },
  })

  const indexToId = new Map<number, string>()

  // Short numeric IDs (1, 2, 3...) instead of UUIDs — much easier for the model to copy
  const text = products
    .map((p, i) => {
      const idx = i + 1
      indexToId.set(idx, p.id)
      return `${idx}|${p.name}${p.sku ? `|${p.sku}` : ""}`
    })
    .join("\n")

  return { text, indexToId }
}

interface IndexedSuppliers {
  text: string
  indexToId: Map<number, string>
}

async function loadIndexedSuppliers(): Promise<IndexedSuppliers> {
  const suppliers = await prisma.supplier.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  })

  const indexToId = new Map<number, string>()
  const text = suppliers
    .map((s, i) => {
      const idx = i + 1
      indexToId.set(idx, s.id)
      return `${idx}|${s.name}`
    })
    .join("\n")

  return { text, indexToId }
}

/**
 * Resolve a matchedProductId that might be a short numeric index OR a UUID.
 * Returns the real UUID, or the original value if it's already a UUID/unknown.
 */
export function resolveProductId(
  id: string | null | undefined,
  indexToId: Map<number, string>
): string | null {
  if (!id) return null
  const num = parseInt(id, 10)
  if (!isNaN(num) && indexToId.has(num)) return indexToId.get(num)!
  return id
}

async function loadPOContext(): Promise<string> {
  const pos = await prisma.purchaseOrder.findMany({
    include: {
      supplier: { select: { name: true } },
      lineItems: {
        select: { description: true, qtyOrdered: true },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  // Compact format to minimize tokens
  return pos
    .map((po) => {
      const items = po.lineItems
        .map((li) => `  ${li.description} x${Number(li.qtyOrdered)}`)
        .join("\n")
      return `PO#${po.poNumber}|${po.supplier.name}|${po.status}|$${Number(po.amount ?? 0)}\n${items}`
    })
    .join("\n")
}

// ─── Build product lookup for enriching AI results ───

interface ProductData {
  id: string
  name: string
  sku: string | null
  unitOfMeasure: string
  currentQty: number
  tier: string
  categoryName: string
  lastCost: number
  avgCost: number
  reorderPoint: number
  dimLength: number | null
  dimLengthUnit: string | null
  dimWidth: number | null
  dimWidthUnit: string | null
}

async function loadProductMap(): Promise<Map<string, ProductData>> {
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

  const map = new Map<string, ProductData>()
  for (const p of products) {
    map.set(p.id, {
      id: p.id,
      name: p.name,
      sku: p.sku,
      unitOfMeasure: p.unitOfMeasure,
      currentQty: Number(p.currentQty),
      tier: p.tier,
      categoryName: p.category.name,
      lastCost: Number(p.lastCost ?? 0),
      avgCost: Number(p.avgCost ?? 0),
      reorderPoint: Number(p.reorderPoint ?? 0),
      dimLength: p.dimLength ? Number(p.dimLength) : null,
      dimLengthUnit: p.dimLengthUnit,
      dimWidth: p.dimWidth ? Number(p.dimWidth) : null,
      dimWidthUnit: p.dimWidthUnit,
    })
  }
  return map
}

// ─── JSON extraction helper ───

function extractJSON(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    const match = text.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (match) return JSON.parse(match[1].trim())
    const start = text.search(/[{[]/)
    if (start >= 0) return JSON.parse(text.slice(start))
    throw new Error("Could not extract JSON from response")
  }
}

// ─── System prompt ───

const SYSTEM_PROMPT = `You are the AI brain for RSNE (Refrigerated Structures of New England), a company that builds walk-in coolers and freezers. You help their team receive materials, match products, and identify purchase orders.

You think like an experienced warehouse manager who knows the product catalog, recognizes suppliers by name, and can match a packing slip to the right PO using common sense.

Industry context:
- RSNE stocks: insulated metal panels (IMP), door hardware, metal trim/flashing, sealants/adhesives, gaskets, heater wire, FRP panels, plywood, fasteners, insulation
- Common abbreviations: IMP = Insulated Metal Panel, W/W = White/White, FRP = Fiberglass Reinforced Panel, SS = Stainless Steel, Galv = Galvalume/Galvanized
- Foam kits like "FROTH-PAK" are common sealant/insulation items
- Panel dimensions: thickness x width x length (e.g., "4in IMP W/W 3x20")

IMPORTANT: Respond ONLY with valid JSON. No markdown, no code fences, no explanation.`

// ─── Text input (used for BOM builder, quick adds) ───

export async function parseTextInput(text: string): Promise<CatalogMatch[]> {
  const [catalog, productMap] = await Promise.all([
    loadIndexedCatalog(),
    loadProductMap(),
  ])

  const { text: response } = await generateText({
    model: MODEL_FAST,
    system: SYSTEM_PROMPT,
    prompt: `A warehouse worker typed or spoke this:
"${text}"

Please parse each item they mentioned and match it to the best product in our catalog. Use your judgment — product names won't be exact matches. Think about what the person likely means given the industry context.

CATALOG (ID|name|SKU — one per line):
${catalog.text}

Return JSON:
{
  "items": [
    {
      "rawText": "the original text for this item",
      "name": "your best description of what they want",
      "quantity": 1,
      "unitOfMeasure": "each|linear ft|sq ft|sheet|tube|box|case|roll|etc",
      "category": "best category guess or null",
      "estimatedCost": null,
      "confidence": 0.95,
      "matchedProductId": "product ID from catalog or null if no good match",
      "matchConfidence": 0.9,
      "alternativeProductIds": ["2nd best ID", "3rd best ID"]
    }
  ]
}

Rules:
- ALWAYS try to match every item to a catalog product. The user can easily correct a wrong match, but missing matches create extra work.
- Set matchConfidence honestly (0.0-1.0), but STILL return the best matchedProductId even at lower confidence.
- Only set matchedProductId to null if the item is truly unlike anything in the catalog.
- Obvious matches: "froth pak" → "FROTH-PAK 200" (matchConfidence: 0.95)
- Ambiguous: if 2-3 products could match, pick the best but set matchConfidence lower (0.5-0.7) and include alternatives
- Parse EVERY item mentioned, even vague ones`,
  })

  const parsed = extractJSON(response) as { items?: AIMatchedItem[] }
  if (!Array.isArray(parsed.items)) throw new Error("AI response missing items array")

  // Resolve short numeric IDs → real UUIDs before product lookup
  const resolved = parsed.items.map((item) => ({
    ...item,
    matchedProductId: resolveProductId(item.matchedProductId ?? null, catalog.indexToId),
    alternativeProductIds: (item.alternativeProductIds || [])
      .map((id) => resolveProductId(id, catalog.indexToId))
      .filter((id): id is string => id !== null),
  }))

  return resolved.map((item) => toCatalogMatch(item, productMap))
}

// ─── Text input with receiving context (extracts supplier/PO info) ───

export async function parseReceivingTextInput(text: string): Promise<ImageParseResult> {
  const [catalog, suppliers, poContext, productMap] = await Promise.all([
    loadIndexedCatalog(),
    loadIndexedSuppliers(),
    loadPOContext(),
    loadProductMap(),
  ])

  const { text: response } = await generateText({
    model: MODEL_FAST,
    system: SYSTEM_PROMPT,
    prompt: `A warehouse worker typed or spoke this while receiving materials:
"${text}"

Please do TWO things:

1. IDENTIFY SUPPLIER & PO — Look for any mention of a supplier name or PO number. Match against our known suppliers and open POs.

SUPPLIERS (ID|name):
${suppliers.text}

PURCHASE ORDERS (recent, most relevant):
${poContext}

2. PARSE & MATCH ITEMS — Parse each item mentioned and match to our catalog.

CATALOG (ID|name|SKU — one per line):
${catalog.text}

Return JSON:
{
  "supplier": "supplier name if mentioned, or null",
  "supplierId": "matched supplier ID from list above, or null",
  "poNumber": "PO number if mentioned, or null",
  "matchedPoId": "matched PO ID from list above, or null",
  "items": [
    {
      "rawText": "the original text for this item",
      "name": "your best description of what they want",
      "quantity": 1,
      "unitOfMeasure": "each|linear ft|sq ft|sheet|tube|box|case|roll|etc",
      "category": "best category guess or null",
      "estimatedCost": null,
      "confidence": 0.95,
      "matchedProductId": "product ID from catalog or null if no good match",
      "matchConfidence": 0.9,
      "alternativeProductIds": ["2nd best ID", "3rd best ID"]
    }
  ]
}

Rules:
- Look for supplier names like "from Hadco", "Metl-Span delivery", etc.
- Look for PO references like "PO 345", "purchase order 12", "on PO number 88"
- Match supplier names generously — "Hadco" matches "Hadco Metal Trading Co., LLC"
- Match PO numbers exactly
- ALWAYS try to match every item to a catalog product. Set matchConfidence honestly, but still return the best matchedProductId even at lower confidence. Only set matchedProductId to null if the item is truly unlike anything in the catalog.
- If no supplier or PO is mentioned, set those fields to null
- Parse EVERY item mentioned, even vague ones`,
  })

  const parsed = extractJSON(response) as {
    items?: AIMatchedItem[]
    supplier?: string
    supplierId?: string
    poNumber?: string
    matchedPoId?: string
  }
  if (!Array.isArray(parsed.items)) throw new Error("AI response missing items array")

  // Resolve short numeric IDs → real UUIDs
  const resolvedItems = parsed.items.map((item) => ({
    ...item,
    matchedProductId: resolveProductId(item.matchedProductId ?? null, catalog.indexToId),
    alternativeProductIds: (item.alternativeProductIds || [])
      .map((id) => resolveProductId(id, catalog.indexToId))
      .filter((id): id is string => id !== null),
  }))

  return {
    items: resolvedItems.map((item) => toCatalogMatch(item, productMap)),
    supplier: parsed.supplier || undefined,
    supplierId: resolveProductId(parsed.supplierId ?? null, suppliers.indexToId) || undefined,
    poNumber: parsed.poNumber || undefined,
    poId: parsed.matchedPoId || undefined,
  }
}

// ─── Panel voice input (lightweight panel-specific parser) ───

export interface PanelVoiceResult {
  panels: Array<{ height: number; quantity: number }>
}

export async function parsePanelVoiceInput(
  text: string,
  context: { brand: string; thickness: number; bundleSize: number }
): Promise<PanelVoiceResult> {
  const { text: response } = await generateText({
    model: MODEL_FAST,
    system: `You extract panel sizes and quantities from warehouse speech. Respond ONLY with valid JSON. No markdown, no code fences, no explanation.`,
    prompt: `A warehouse worker is receiving ${context.brand} ${context.thickness}" insulated metal panels. They said:
"${text}"

Extract each panel size (height in feet) and quantity (number of individual panels).

Context:
- These panels come in bundles of ${context.bundleSize} panels each
- If the worker says "bundles", multiply by ${context.bundleSize} to get panel count
- Heights are in feet (whole numbers, typically 8-40)
- Quantities are individual panel counts (whole numbers)

Examples:
Input: "11 ten-foot panels, 22 eight-foot"
Output: {"panels": [{"height": 8, "quantity": 22}, {"height": 10, "quantity": 11}]}

Input: "got one bundle of ten-foot and two bundles of eight-foot"
Output: {"panels": [{"height": 8, "quantity": ${context.bundleSize * 2}}, {"height": 10, "quantity": ${context.bundleSize}}]}

Input: "10 footers 11, 8 footers 22, 12 footers 8"
Output: {"panels": [{"height": 8, "quantity": 22}, {"height": 10, "quantity": 11}, {"height": 12, "quantity": 8}]}

Input: "twenty-two 8 foot, eleven 10 foot"
Output: {"panels": [{"height": 8, "quantity": 22}, {"height": 10, "quantity": 11}]}

Input: "there's 11 of the ten foot ones and like 22 of the eight foot"
Output: {"panels": [{"height": 8, "quantity": 22}, {"height": 10, "quantity": 11}]}

Input: "3 bundles 10 foot, 2 bundles 8 foot, 1 bundle 12 foot"
Output: {"panels": [{"height": 8, "quantity": ${context.bundleSize * 2}}, {"height": 10, "quantity": ${context.bundleSize * 3}}, {"height": 12, "quantity": ${context.bundleSize}}]}

Now extract from the worker's speech above. Sort by height ascending.
Return JSON: {"panels": [{"height": <number>, "quantity": <number>}]}`,
  })

  const parsed = extractJSON(response) as { panels?: Array<{ height: number; quantity: number }> }
  if (!Array.isArray(parsed.panels)) throw new Error("AI response missing panels array")

  // Validate and clean
  const panels = parsed.panels
    .filter((p) => p.height >= 8 && p.height <= 40 && p.quantity > 0)
    .map((p) => ({ height: Math.round(p.height), quantity: Math.round(p.quantity) }))
    .sort((a, b) => a.height - b.height)

  return { panels }
}

// ─── Image input (packing slips, invoices, BOMs) ───

export interface ImageParseResult {
  items: CatalogMatch[]
  supplier?: string
  supplierId?: string
  poNumber?: string
  poId?: string
  deliveryDate?: string
}

export async function parseImageInput(
  imageBase64: string | string[],
  mimeType: string | string[]
): Promise<ImageParseResult> {
  const [catalog, suppliers, poContext, productMap] = await Promise.all([
    loadIndexedCatalog(),
    loadIndexedSuppliers(),
    loadPOContext(),
    loadProductMap(),
  ])

  // Support single or multiple images
  const images = Array.isArray(imageBase64) ? imageBase64 : [imageBase64]
  const mimeTypes = Array.isArray(mimeType) ? mimeType : [mimeType]

  const imageParts = images.map((img, i) => ({
    type: "image" as const,
    image: img,
    mediaType: mimeTypes[i] || mimeTypes[0],
  }))

  const multiPageNote = images.length > 1
    ? `\n\nIMPORTANT: You are looking at ${images.length} pages of the SAME document. Combine all line items from ALL pages into a single items array. The supplier and PO info may appear on any page (usually the first).`
    : ""

  const { text: response } = await generateText({
    model: MODEL_VISION,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          ...imageParts,
          {
            type: "text",
            text: `Please analyze ${images.length > 1 ? "these images (multiple pages of the same document)" : "this image"} (likely a packing slip, invoice, or material list) and do the following:${multiPageNote}

1. IDENTIFY THE SUPPLIER — Who sent this? Match the sender company to one of our known suppliers.

SUPPLIERS (ID|name):
${suppliers.text}

2. FIND THE PURCHASE ORDER — Look for a "Customer PO" number (usually 1-4 digits). Then match it EXACTLY against our POs below. IMPORTANT: PO numbers must match exactly — PO#344 is NOT PO#34. If the exact number isn't found, try matching by supplier + items + quantities. Prefer OPEN or PARTIALLY_RECEIVED POs, but match CLOSED ones too.

PURCHASE ORDERS:
${poContext}

3. EXTRACT & MATCH ITEMS — Parse every line item and match each to the best product in our catalog. Product names on packing slips often differ from catalog names — use your judgment.

CATALOG (ID|name|SKU):
${catalog.text}

Return JSON:
{
  "supplier": "supplier name as shown on document",
  "supplierId": "matched supplier ID from list above, or null",
  "poNumber": "PO number as shown on document, or null",
  "matchedPoId": "matched PO ID from list above, or null",
  "poMatchReasoning": "brief explanation of why you matched (or didn't match) this PO",
  "deliveryDate": "ISO date if visible, or null",
  "items": [
    {
      "rawText": "original text from the document for this line",
      "name": "your best description of the item",
      "quantity": 12,
      "unitOfMeasure": "each",
      "category": "category guess or null",
      "estimatedCost": 25.50,
      "confidence": 0.95,
      "matchedProductId": "product ID from catalog or null",
      "matchConfidence": 0.85,
      "alternativeProductIds": ["2nd best", "3rd best"]
    }
  ]
}

Think step by step:
- The supplier logo/name is usually at the top
- Customer PO is RSNE's PO number, NOT the supplier's order/shipment number
- Match items by meaning, not exact text — "FROTH-PAK 200 1.75PCF LOW GWP FOAM SEALANT KIT" should match "FROTH-PAK 200"
- ALWAYS try to match every item to a catalog product. Set matchConfidence honestly, but still return the best matchedProductId even at lower confidence. Only set matchedProductId to null if the item is truly unlike anything in the catalog.
- If the PO number is on the document but doesn't match any open PO, still return it — the PO may be closed or not in the system`,
          },
        ],
      },
    ],
  })

  const parsed = extractJSON(response) as {
    items?: AIMatchedItem[]
    supplier?: string
    supplierId?: string
    poNumber?: string
    matchedPoId?: string
    poMatchReasoning?: string
    deliveryDate?: string
  }

  if (!Array.isArray(parsed.items)) throw new Error("AI response missing items array")

  // Resolve short numeric IDs → real UUIDs
  const resolvedItems = parsed.items.map((item) => ({
    ...item,
    matchedProductId: resolveProductId(item.matchedProductId ?? null, catalog.indexToId),
    alternativeProductIds: (item.alternativeProductIds || [])
      .map((id) => resolveProductId(id, catalog.indexToId))
      .filter((id): id is string => id !== null),
  }))

  return {
    items: resolvedItems.map((item) => toCatalogMatch(item, productMap)),
    supplier: parsed.supplier,
    supplierId: resolveProductId(parsed.supplierId ?? null, suppliers.indexToId) || undefined,
    poNumber: parsed.poNumber,
    poId: parsed.matchedPoId || undefined,
    deliveryDate: parsed.deliveryDate,
  }
}

// ─── Convert AI result to CatalogMatch type ───

interface AIMatchedItem {
  rawText?: string
  name?: string
  quantity?: number
  unitOfMeasure?: string
  category?: string
  dimensions?: ParsedLineItem["dimensions"]
  finish?: string
  material?: string
  specs?: Record<string, string>
  estimatedCost?: number
  confidence?: number
  matchedProductId?: string | null
  matchConfidence?: number
  alternativeProductIds?: string[]
}

/**
 * Detect if an item is a panel based on AI name/text or matched product name.
 * Panels from AI input (voice/text/photo) should NEVER match to branded catalog products.
 * Instead they become generic non-catalog panel items with specs — brand is chosen at checkout.
 */
function isItemPanel(item: AIMatchedItem, matchedProduct?: ProductData): boolean {
  // Check if the matched product is a branded panel
  if (matchedProduct && isPanelProduct(matchedProduct.name)) return true
  // Check if the parsed item text describes a panel
  const text = `${item.rawText ?? ""} ${item.name ?? ""}`
  return isPanelLineItem({ productName: text, description: null })
}

/**
 * Extract panel specs (thickness, cut length, width) from the AI-parsed item text.
 * Returns null if we can't determine at least a thickness.
 */
function extractPanelSpecs(item: AIMatchedItem, matchedProduct?: ProductData): {
  thickness: number
  cutLengthFt: number
  cutLengthDisplay: string
  widthIn: number
  profile: string
  color: string
} | null {
  const text = `${item.rawText ?? ""} ${item.name ?? ""}`

  // Extract thickness — look for patterns like 4", 4in, 4 inch
  let thickness: number | null = null
  const thicknessMatch = text.match(/(\d+(?:\.\d+)?)\s*["″]\s*(?:thick|insul|imp|panel|metal|wall|ceil)/i)
    || text.match(/(\d+(?:\.\d+)?)\s*["″]\s*(?:IMP|imp)/i)
    || text.match(/(\d+)\s*(?:inch|in)\s*(?:thick|insul|imp|panel)/i)
  if (thicknessMatch) {
    const val = parseFloat(thicknessMatch[1])
    if (val >= 2 && val <= 8) thickness = val
  }
  // Fall back to matched product dimensions
  if (!thickness && matchedProduct?.name) {
    const prodMatch = matchedProduct.name.match(/-(\d+)$/)
    if (prodMatch) thickness = parseFloat(prodMatch[1])
  }
  if (!thickness) thickness = 4 // default

  // Extract cut length — look for patterns like 7'6", 10', 9ft, etc.
  let cutLengthFt = 0
  let cutLengthDisplay = ""
  const lengthMatch = text.match(/(\d+)\s*[''′]\s*(\d+)?(?:\s*["″])?/)
    || text.match(/(\d+(?:\.\d+)?)\s*(?:ft|foot|feet)\b/)
    || text.match(/(\d+(?:\.\d+)?)\s*[''′]/)
  if (lengthMatch) {
    const feet = parseInt(lengthMatch[1])
    const inches = lengthMatch[2] ? parseInt(lengthMatch[2]) : 0
    cutLengthFt = feet + inches / 12
    cutLengthDisplay = inches > 0 ? `${feet}'${inches}"` : `${feet}'`
  }
  // Fall back to matched product height
  if (!cutLengthFt && matchedProduct?.dimLength) {
    cutLengthFt = matchedProduct.dimLength
    cutLengthDisplay = `${matchedProduct.dimLength}'`
  }
  if (!cutLengthFt) {
    cutLengthFt = 0
    cutLengthDisplay = "TBD"
  }

  // Width — default 44"
  let widthIn = 44
  if (matchedProduct?.dimWidth) widthIn = matchedProduct.dimWidth

  return {
    thickness,
    cutLengthFt,
    cutLengthDisplay,
    widthIn,
    profile: "Mesa",
    color: "White",
  }
}

function toCatalogMatch(
  item: AIMatchedItem,
  productMap: Map<string, ProductData>
): CatalogMatch {
  const parsedItem: ParsedLineItem = {
    rawText: item.rawText || item.name || "",
    name: item.name || "",
    quantity: item.quantity || 1,
    unitOfMeasure: item.unitOfMeasure || "each",
    category: item.category,
    dimensions: item.dimensions,
    finish: item.finish,
    material: item.material,
    specs: item.specs,
    estimatedCost: item.estimatedCost,
    confidence: item.confidence ?? 0.5,
  }

  const matchedProduct = item.matchedProductId
    ? productMap.get(item.matchedProductId)
    : undefined

  // No server-side confidence gate — the UI flags low-confidence matches in orange
  // for user review. Dropping matches server-side was causing most items to appear unmatched.

  // Intercept panel items — never match to branded catalog panels.
  // Convert to generic non-catalog panel with specs for checkout-time brand selection.
  if (isItemPanel(item, matchedProduct)) {
    const specs = extractPanelSpecs(item, matchedProduct)
    const panelName = specs
      ? `${specs.thickness}" IMP${specs.cutLengthDisplay !== "TBD" ? ` — ${specs.cutLengthDisplay}` : ""}`
      : parsedItem.name

    return {
      parsedItem: {
        ...parsedItem,
        name: panelName,
        unitOfMeasure: "panel",
        category: "Insulated Metal Panel",
      },
      matchedProduct: null,
      matchConfidence: 0,
      isNonCatalog: true,
      panelSpecs: specs ? {
        type: "panel" as const,
        ...specs,
      } : undefined,
    }
  }

  const alternatives = (item.alternativeProductIds || [])
    .map((id) => productMap.get(id))
    .filter((p): p is ProductData => !!p)
    .map((p) => ({
      id: p.id,
      name: p.name,
      matchConfidence: (item.matchConfidence ?? 0.5) - 0.1,
    }))

  if (matchedProduct) {
    return {
      parsedItem,
      matchedProduct: {
        id: matchedProduct.id,
        name: matchedProduct.name,
        sku: matchedProduct.sku,
        unitOfMeasure: matchedProduct.unitOfMeasure,
        currentQty: matchedProduct.currentQty,
        tier: matchedProduct.tier,
        categoryName: matchedProduct.categoryName,
        lastCost: matchedProduct.lastCost,
        avgCost: matchedProduct.avgCost,
        reorderPoint: matchedProduct.reorderPoint,
        dimLength: matchedProduct.dimLength,
        dimLengthUnit: matchedProduct.dimLengthUnit,
        dimWidth: matchedProduct.dimWidth,
        dimWidthUnit: matchedProduct.dimWidthUnit,
      },
      matchConfidence: item.matchConfidence ?? 0.8,
      isNonCatalog: false,
      alternativeMatches: alternatives.length > 0 ? alternatives : undefined,
    }
  }

  return {
    parsedItem,
    matchedProduct: null,
    matchConfidence: 0,
    isNonCatalog: true,
  }
}

// ─── BOM-specific streaming image parser ───
// Lighter than parseImageInput — no supplier/PO context, uses streamObject for progressive items

const bomItemSchema = z.object({
  rawText: z.string().describe("Original text from the document for this line"),
  name: z.string().describe("Best description of the item"),
  quantity: z.number().describe("Quantity"),
  unitOfMeasure: z.string().describe("Unit: each, linear ft, sq ft, sheet, tube, box, case, roll, etc"),
  category: z.string().nullable().describe("Category guess or null"),
  estimatedCost: z.number().nullable().describe("Per-unit cost if visible, or null"),
  confidence: z.number().describe("How confident you are in reading this line (0.0-1.0)"),
  matchedProductId: z.string().nullable().describe("Product ID from catalog, or null if no good match"),
  matchConfidence: z.number().describe("How confident the catalog match is (0.0-1.0)"),
  alternativeProductIds: z.array(z.string()).describe("2nd and 3rd best product IDs"),
})

export type BomStreamItem = z.infer<typeof bomItemSchema>

/**
 * Stream-parse an image for BOM creation.
 * Only loads catalog context (no suppliers/POs) — much faster.
 * Returns an async iterable of items via streamObject array mode.
 */
export async function parseBomImageStream(
  imageBase64: string | string[],
  mimeType: string | string[]
) {
  const catalog = await loadIndexedCatalog()

  const images = Array.isArray(imageBase64) ? imageBase64 : [imageBase64]
  const mimeTypes = Array.isArray(mimeType) ? mimeType : [mimeType]

  const imageParts = images.map((img, i) => ({
    type: "image" as const,
    image: img,
    mediaType: mimeTypes[i] || mimeTypes[0],
  }))

  const multiPageNote = images.length > 1
    ? `\n\nIMPORTANT: You are looking at ${images.length} pages of the SAME document. Combine all line items from ALL pages into a single list.`
    : ""

  const result = streamObject({
    model: MODEL_VISION,
    output: "array",
    schema: bomItemSchema,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          ...imageParts,
          {
            type: "text",
            text: `Analyze ${images.length > 1 ? "these images (multiple pages)" : "this image"} of a material list, packing slip, or BOM. Extract every line item and match each to the best product in our catalog.${multiPageNote}

CATALOG (ID|name|SKU):
${catalog.text}

For each item, output a JSON object with the fields defined in the schema. Rules:
- ALWAYS try to match every item to a catalog product. The user can easily correct a wrong match, but missing matches create extra work.
- Set matchConfidence honestly (0.0-1.0), but STILL return the best matchedProductId even at lower confidence.
- Only set matchedProductId to null if the item is truly unlike anything in the catalog.
- "FROTH-PAK 200" → match to "FROTH-PAK 200" (matchConfidence: 0.95)
- "PVC corner 8'" → match to nearest PVC corner product (matchConfidence: 0.7-0.9)
- "tech screws" → match to nearest screw/fastener product (matchConfidence: 0.6-0.8)
- Ambiguous items: pick best match, include alternatives in alternativeProductIds
- Parse EVERY item, even vague ones
- Output items in document order`,
          },
        ],
      },
    ],
  })

  return { stream: result, indexToId: catalog.indexToId }
}

/**
 * Convert a raw AI-streamed BOM item into a CatalogMatch.
 * Must be called with a pre-loaded productMap.
 */
export function toBomCatalogMatch(
  item: BomStreamItem,
  productMap: Map<string, ProductData>
): CatalogMatch {
  return toCatalogMatch(
    {
      rawText: item.rawText,
      name: item.name,
      quantity: item.quantity,
      unitOfMeasure: item.unitOfMeasure,
      category: item.category ?? undefined,
      estimatedCost: item.estimatedCost ?? undefined,
      confidence: item.confidence,
      matchedProductId: item.matchedProductId,
      matchConfidence: item.matchConfidence,
      alternativeProductIds: item.alternativeProductIds,
    },
    productMap
  )
}

// Re-export loadProductMap for use by the streaming API route
export { loadProductMap }
