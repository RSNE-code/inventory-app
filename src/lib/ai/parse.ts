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
  // Assembly items are real products with isAssembly=true — single query gets everything
  const products = await prisma.product.findMany({
    where: { isActive: true },
    select: { id: true, name: true, sku: true, isAssembly: true },
    orderBy: { name: "asc" },
  })

  const indexToId = new Map<number, string>()

  // Short numeric IDs (1, 2, 3...) instead of UUIDs — much easier for the model to copy
  // Assembly products get [FABRICATION] tag so the LLM knows they're in-house items
  const lines = products.map((p, i) => {
    const idx = i + 1
    indexToId.set(idx, p.id)
    const prefix = p.isAssembly ? "[FABRICATION] " : ""
    return `[${idx}] ${prefix}${p.name}${p.sku ? ` (${p.sku})` : ""}`
  })

  const text = lines.join("\n")

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
      return `[${idx}] ${s.name}`
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
  isAssembly: boolean
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
      isAssembly: true,
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
      isAssembly: p.isAssembly,
    })
  }
  return map
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
- Common abbreviations: IMP = Insulated Metal Panel, W/W = White/White, FRP = Fiberglass Reinforced Panel, SS = Stainless Steel, Galv = Galvalume/Galvanized, DP = Diamond Plate, HC = Heater Cable, PVC = PVC
- Gauge/thickness shorthand: O63 = .063", O40 = .040", O90 = .090", O32 = .032". These are sheet metal gauges commonly used for diamond plate and metal stock.
- Diamond plate: also called "DP", "checker plate", "tread plate". Gauge is part of the name (e.g., "Diamond Plate .063 4' x 8'")
- TWS = Trim/Wall/Steel metal trim pieces cut from steel coil. Types: OC = Outside Corner, IC = Inside Corner, Cap, Screed, Base Cover Trim, Flat Batten
- TWS dimensions: width x depth (e.g., "OC 2x3" = TWS Outside Corner 2" x 3", "IC 3x3" = TWS Inside Corner 3" x 3")
- Foam kits like "FROTH-PAK" are common sealant/insulation items (sizes: 200, 620)
- Panel dimensions: thickness x width x length (e.g., "4in IMP W/W 3x20")
- Dimension formats: Workers say "4x8" meaning 4' x 8' (feet). "7'6" or "7'6\"" = 7 feet 6 inches = 7.5 feet. "90 in" = 7.5 feet.
- Color shorthand: WHT = White, BLK = Black, CLR = Clear
- Fastener shorthand: TEK = TEK screws (self-drilling), SD = Self Drilling

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

CATALOG (each line is: [id] product_name (sku)):
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
      "matchedProductId": "the [id] number from the catalog, as a string, or null",
      "matchConfidence": 0.9,
      "alternativeProductIds": ["2nd best ID", "3rd best ID"]
    }
  ]
}

IMPORTANT: For matchedProductId, return the number inside the brackets [id] from the catalog.

MATCHING GUIDANCE:
- Warehouse workers use abbreviations and shorthand. "tek screws" = TEK screws, "drive pins" = Drive Pins, "OC 2x3" = Outside Corner 2"x3".
- When an item is generic (e.g., "tek screws" without a size), pick the MOST COMMON variant as the best match and list other sizes in alternativeProductIds. Do NOT return null just because the user didn't specify a size.
- When multiple catalog products match (e.g., several TEK screw sizes), pick the best one and include 2-3 alternatives. The user can easily switch — but having NO match forces them to search manually.
- GAUGE NUMBERS: When you see "O63", ".063", or similar, these are metal gauges. Match to products with that gauge in the name (e.g., "O63 diamond plate" → "Diamond Plate .063 4' x 8'").
- DIMENSION FORMAT: "4x8" = 4' x 8'. "7'6" = 7'6" = 7.5 feet. Always convert to feet when comparing to catalog products.
- If the user says a size/gauge and only one catalog product matches that specification, it's a strong match even if the name is partial.

FABRICATION ITEMS (marked [FABRICATION] in catalog):
- These are doors, sliders, floor panels, wall panels, and ramps that we build in-house.
- ALWAYS prefer [FABRICATION] items over regular catalog products when the item is a door, slider, panel, or ramp WITHOUT a specific supplier/brand name.
- "sliding door" = "slider", "swing door" = "cooler door" or "freezer door", "walk-in door" = cooler/freezer door.
- Round dimensions UP to the nearest standard size: 6'6" height → match to 7' template, 5'10" → 6'.
- Only match to a regular product instead of [FABRICATION] if a specific supplier/brand is mentioned (e.g., "Jamison door", "Kolpak slider").
- Examples: "sliding door 5x7" → [FABRICATION] Cooler Slider 5' x 7', "3x7 cooler door" → [FABRICATION] Cooler Door 3' x 7', "freezer door 3x7" → [FABRICATION] Exterior Freezer Door 3' x 7'.

CONFIDENCE CALIBRATION:
- 0.90-1.0: Product name AND dimensions/gauge match exactly (e.g., "#12 TEK 5" → "#12 TEK 5", "O63 diamond plate 4x8" → "Diamond Plate .063 4' x 8'")
- 0.85-0.90: Product name matches clearly, dimensions absent or compatible (e.g., "Froth Pak" → "FROTH-PAK 200")
- 0.70-0.85: Likely match but some ambiguity (e.g., "tek screws" → "#12 TEK 5" — right product family, size unspecified)
- 0.50-0.70: Plausible but uncertain (e.g., "drive pins" → "Hilti Drive Pins")
- Below 0.50: Very weak match — still return the best guess with low confidence rather than null
- DIMENSIONS CONFLICT: If the text specifies dimensions that conflict with the catalog product (e.g., "10x10" vs "6\""), set matchedProductId to null

Rules:
- ALWAYS try to match. A missing match forces the user to manually search the catalog. A wrong match is one tap to fix.
- Only set matchedProductId to null if the item is truly unlike anything in the catalog OR dimensions explicitly conflict.
- If dimensions in the text conflict with the catalog product, return null. But MISSING dimensions are NOT a conflict.
- Ambiguous: pick best match, include alternatives in alternativeProductIds
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

SUPPLIERS (each line is: [id] supplier_name):
${suppliers.text}

PURCHASE ORDERS (recent, most relevant):
${poContext}

2. PARSE & MATCH ITEMS — Parse each item mentioned and match to our catalog.

CATALOG (each line is: [id] product_name (sku)):
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
      "matchedProductId": "the [id] number from the catalog, as a string, or null",
      "matchConfidence": 0.9,
      "alternativeProductIds": ["2nd best ID", "3rd best ID"]
    }
  ]
}

IMPORTANT: For matchedProductId and supplierId, return the number inside the brackets [id] from the respective lists.

CONFIDENCE GUIDE: Exact name = 0.90-0.95. Name matches but sizes/specs differ = 0.75-0.90. Related product = 0.50-0.75.

Rules:
- Look for supplier names like "from Hadco", "Metl-Span delivery", etc.
- Look for PO references like "PO 345", "purchase order 12", "on PO number 88"
- Match supplier names generously — "Hadco" matches "Hadco Metal Trading Co., LLC"
- Match PO numbers exactly
- ALWAYS try to match every item to a catalog product. Only set matchedProductId to null if truly unlike anything in the catalog.
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

SUPPLIERS (each line is: [id] supplier_name):
${suppliers.text}

2. FIND THE PURCHASE ORDER — Look for a "Customer PO" number (usually 1-4 digits). Then match it EXACTLY against our POs below. IMPORTANT: PO numbers must match exactly — PO#344 is NOT PO#34. If the exact number isn't found, try matching by supplier + items + quantities. Prefer OPEN or PARTIALLY_RECEIVED POs, but match CLOSED ones too.

PURCHASE ORDERS:
${poContext}

3. EXTRACT & MATCH ITEMS — Parse every line item and match each to the best product in our catalog. Product names on packing slips often differ from catalog names — use your judgment.

CATALOG (each line is: [id] product_name (sku)):
${catalog.text}

IMPORTANT: For matchedProductId, return the number inside the brackets [id] from the catalog. For example, if the catalog line is "[42] FROTH-PAK 200 (FP200)", return "42".

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
      "matchedProductId": "the [id] number from the catalog, as a string, or null",
      "matchConfidence": 0.85,
      "alternativeProductIds": ["2nd best", "3rd best"]
    }
  ]
}

IMPORTANT: For matchedProductId, return the number inside the brackets [id] from the catalog. For supplierId, return the [id] from the supplier list.

CONFIDENCE GUIDE: Exact name = 0.90-0.95. Name matches but sizes/specs differ = 0.75-0.90. Related product = 0.50-0.75.

Think step by step:
- The supplier logo/name is usually at the top
- Customer PO is RSNE's PO number, NOT the supplier's order/shipment number
- Match items by meaning, not exact text — "FROTH-PAK 200 1.75PCF LOW GWP FOAM SEALANT KIT" should match "FROTH-PAK 200"
- ALWAYS try to match every item to a catalog product. Only set matchedProductId to null if truly unlike anything in the catalog.
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
  // Structured dimensions — set by BOM image parser, used by extractPanelSpecs
  lengthFt?: number | null
  lengthIn?: number | null
  thicknessIn?: number | null
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
  // ── Thickness ──
  // Prefer structured AI field, fall back to regex
  let thickness: number | null = null
  if (item.thicknessIn != null && item.thicknessIn >= 2 && item.thicknessIn <= 8) {
    thickness = item.thicknessIn
  }
  if (!thickness) {
    const text = `${item.rawText ?? ""} ${item.name ?? ""}`
    const thicknessMatch = text.match(/(\d+(?:\.\d+)?)\s*["″]\s*(?:thick|insul|imp|panel|metal|wall|ceil)/i)
      || text.match(/(\d+(?:\.\d+)?)\s*["″]\s*(?:IMP|imp)/i)
      || text.match(/(\d+)\s*(?:inch|in)\s*(?:thick|insul|imp|panel)/i)
    if (thicknessMatch) {
      const val = parseFloat(thicknessMatch[1])
      if (val >= 2 && val <= 8) thickness = val
    }
  }
  if (!thickness && matchedProduct?.name) {
    const prodMatch = matchedProduct.name.match(/-(\d+)$/)
    if (prodMatch) thickness = parseFloat(prodMatch[1])
  }
  if (!thickness) thickness = 4 // default

  // ── Cut length ──
  // Prefer structured AI fields, fall back to regex on rawText
  let cutLengthFt = 0
  let cutLengthDisplay = ""
  if (item.lengthFt != null && item.lengthFt > 0) {
    const feet = item.lengthFt
    const inches = item.lengthIn ?? 0
    cutLengthFt = feet + inches / 12
    cutLengthDisplay = inches > 0 ? `${feet}'${inches}"` : `${feet}'`
  }
  // Regex fallback (for non-BOM parsers that don't set structured fields)
  if (!cutLengthFt) {
    const rawText = item.rawText ?? ""
    const text = `${rawText} ${item.name ?? ""}`
    const lengthMatch = rawText.match(/(\d+)\s*[''′']\s*[-–]?\s*(\d+)\s*["″"]/)
      || rawText.match(/(\d+)\s*(?:ft|foot|feet)[\s.]*(\d+)\s*(?:in|inch|inches)\b/)
      || rawText.match(/(\d+)\s*[''′']\s*[-–]?\s*(\d+)(?=\s|$)/)
      || rawText.match(/(\d+(?:\.\d+)?)\s*(?:ft|foot|feet)\b/)
      || rawText.match(/(\d+(?:\.\d+)?)\s*[''′'](?:\s|$)/)
      || text.match(/(\d+)\s*[''′']\s*[-–]?\s*(\d+)\s*["″"]/)
      || text.match(/(\d+)\s*(?:ft|foot|feet)[\s.]*(\d+)\s*(?:in|inch|inches)\b/)
      || text.match(/(\d+(?:\.\d+)?)\s*(?:ft|foot|feet)\b/)
      || text.match(/(\d+(?:\.\d+)?)\s*[''′'](?:\s|$)/)
    if (lengthMatch) {
      const feet = parseInt(lengthMatch[1])
      const inches = lengthMatch[2] ? parseInt(lengthMatch[2]) : 0
      cutLengthFt = feet + inches / 12
      cutLengthDisplay = inches > 0 ? `${feet}'${inches}"` : `${feet}'`
    }
  }
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
  productMap: Map<string, ProductData>,
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

  // Assembly products are now real products — no more AT: prefix handling needed
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
        isAssembly: matchedProduct.isAssembly,
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
  quantity: z.number().describe("Quantity exactly as written — do NOT convert units (e.g., if '1 box' is written, return 1, not the number of items in a box)"),
  unitOfMeasure: z.string().describe("Unit exactly as written — lbs, box, roll, case, ea, ct, each, linear ft, sq ft, sheet, tube, gal, bag, etc. Preserve the original unit, do NOT convert to 'each'"),
  category: z.string().nullable().describe("Category guess or null"),
  estimatedCost: z.number().nullable().describe("Per-unit cost if visible, or null"),
  confidence: z.number().describe("How confident you are in reading this line (0.0-1.0)"),
  matchedProductId: z.string().nullable().describe("The [id] number from the catalog (e.g. '1095'), as a string, or null"),
  matchConfidence: z.number().describe("How confident the catalog match is (0.0-1.0)"),
  alternativeProductIds: z.array(z.string()).describe("2nd and 3rd best [id] numbers from catalog"),
  lengthFt: z.number().nullable().describe("Length in whole feet (e.g. 7 for 7'-6\"), or null if no length visible"),
  lengthIn: z.number().nullable().describe("Additional inches beyond feet (e.g. 6 for 7'-6\"), 0 if exact feet, null if no length visible"),
  thicknessIn: z.number().nullable().describe("Panel/material thickness in inches (e.g. 4 for 4\" thick), or null if not a panel or not visible"),
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

CATALOG (each line is: [id] product_name (sku)):
${catalog.text}

For each item, output a JSON object with the fields defined in the schema.

IMPORTANT: For matchedProductId, return the number inside the brackets [id] from the catalog. For example, if the catalog line is "[323] FROTH-PAK 200", return "323".

MATCHING EXAMPLES:

1. Handwritten says "Froth Pak" →
   matchedProductId: "323", matchConfidence: 0.95, alternativeProductIds: []
   (Exact product match — high confidence)

2. Handwritten says "T-Bar" →
   matchedProductId: "1095", matchConfidence: 0.80, alternativeProductIds: ["1096"]
   (Multiple sizes exist — match is plausible but ambiguous)

3. Handwritten says "custom welded bracket" →
   matchedProductId: null, matchConfidence: 0, alternativeProductIds: []
   (Not in catalog — return null)

4. Handwritten says "TWS Cover Plate 10x10 hem 3 sides" →
   matchedProductId: null, matchConfidence: 0, alternativeProductIds: []
   (No 10"x10" TWS product exists in catalog. Do NOT match to a different-sized TWS item like "TWS Flat Batten 6\"". Dimensions 10x10 ≠ 6. This is a custom fabrication item.)

5. Handwritten says "OC 2x3" →
   matchedProductId: "445", matchConfidence: 0.95, alternativeProductIds: []
   (OC = Outside Corner, 2x3 = 2"x3" — matches "TWS Outside Corner 2\" x 3\"" exactly)

6. Handwritten says "tek screws" →
   matchedProductId: "6", matchConfidence: 0.75, alternativeProductIds: ["7", "8"]
   (Generic — no size specified. Pick most common TEK screw, list other sizes as alternatives. Do NOT return null.)

7. Handwritten says "drive pins" →
   matchedProductId: "512", matchConfidence: 0.70, alternativeProductIds: []
   (Abbreviated but clearly refers to drive pins in catalog. ALWAYS match when the product family exists.)

MATCHING GUIDANCE:
- Warehouse workers use abbreviations and shorthand. "tek screws" = TEK screws, "drive pins" = Drive Pins, "OC 2x3" = Outside Corner 2"x3".
- When an item is generic (e.g., "tek screws" without a size), pick the MOST COMMON variant as the best match and list other sizes in alternativeProductIds. Do NOT return null just because the user didn't specify a size.
- When multiple catalog products could match (e.g., several TEK screw sizes), pick the best one and include 2-3 alternatives. The user can easily switch — but having NO match forces them to search manually.

FABRICATION ITEMS (marked [FABRICATION] in catalog):
- These are doors, sliders, floor panels, wall panels, and ramps that we build in-house.
- ALWAYS prefer [FABRICATION] items over regular catalog products when the item is a door, slider, panel, or ramp WITHOUT a specific supplier/brand name.
- "sliding door" = "slider", "swing door" = "cooler door" or "freezer door", "walk-in door" = cooler/freezer door.
- Round dimensions UP to the nearest standard size: 6'6" height → match to 7' template, 5'10" → 6'.
- Only match to a regular product instead of [FABRICATION] if a specific supplier/brand is mentioned (e.g., "Jamison door", "Kolpak slider").
- Examples: "sliding door 5x7" → [FABRICATION] Cooler Slider 5' x 7', "3x7 cooler door" → [FABRICATION] Cooler Door 3' x 7', "freezer door 3x7" → [FABRICATION] Exterior Freezer Door 3' x 7'.

CONFIDENCE CALIBRATION:
- 0.95-1.0: Product name AND dimensions match exactly (e.g., "OC 2x3" → "TWS Outside Corner 2\\" x 3\\"")
- 0.85-0.95: Product name matches clearly, dimensions absent or compatible (e.g., "Froth Pak" → "FROTH-PAK 200")
- 0.70-0.85: Likely match but some ambiguity (e.g., "tek screws" → "#12 TEK 5" — right product family, size unspecified)
- 0.50-0.70: Plausible but uncertain (e.g., "drive pins" → "Hilti Drive Pins")
- Below 0.50: Very weak match — still return the best guess with low confidence rather than null
- DIMENSIONS CONFLICT: If the text specifies dimensions that conflict with the catalog product (e.g., "10x10" vs "6\\""), set matchedProductId to null

DIMENSION RULE:
If the BOM item specifies dimensions (e.g., 10"x10", 8"x12") and the best catalog match has DIFFERENT dimensions, return matchedProductId: null. But MISSING dimensions are NOT a conflict — "tek screws" without a size should still match.

DIMENSION EXTRACTION (for panels and items with length):
- For panels, walls, ceiling panels, or any item with a length: set lengthFt and lengthIn.
  - "7'-6\\"" or "7 ft 6 in" → lengthFt: 7, lengthIn: 6
  - "8'" or "8 ft" → lengthFt: 8, lengthIn: 0
  - No length visible → lengthFt: null, lengthIn: null
- For panels with a thickness (e.g., 4" thick, 4" IMP): set thicknessIn.
  - "4\\"" walls or "4\\" IMP" → thicknessIn: 4
  - Not a panel or no thickness visible → thicknessIn: null
- Do NOT confuse thickness with length. "4\\" walls x 7'-6\\"" means thicknessIn: 4, lengthFt: 7, lengthIn: 6.

UNIT PRESERVATION (CRITICAL):
- NEVER convert units. Return quantity and unitOfMeasure exactly as written on the paper.
- "1 box drive pins" → quantity: 1, unitOfMeasure: "box" — NOT quantity: 100, unitOfMeasure: "each"
- "3 lbs tek screws" → quantity: 3, unitOfMeasure: "lbs" — NOT a converted count
- "500 ct galv tek" → quantity: 500, unitOfMeasure: "ct"
- The unit should reflect what was WRITTEN, not what the catalog product uses.
- Common units to look for: ea, each, lbs, lb, box, roll, case, bag, tube, gal, ct, count, pcs, sheet, bundle.

Rules:
- ALWAYS try to match. A missing match forces the user to manually search the catalog. A wrong match is one tap to fix.
- Only set matchedProductId to null if the item is truly unlike anything in the catalog OR dimensions explicitly conflict.
- If dimensions in the BOM text conflict with the catalog product, return null. But MISSING dimensions are NOT a conflict.
- Ambiguous items: pick best match, include alternatives in alternativeProductIds
- Parse EVERY line item, even vague ones
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
  productMap: Map<string, ProductData>,
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
      lengthFt: item.lengthFt,
      lengthIn: item.lengthIn,
      thicknessIn: item.thicknessIn,
    },
    productMap,
  )
}

// Re-export for use by the streaming API route
export { loadProductMap }
