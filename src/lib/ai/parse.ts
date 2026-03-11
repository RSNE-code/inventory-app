import { generateText } from "ai"
import { anthropic } from "@ai-sdk/anthropic"
import type { ParsedLineItem } from "./types"

const MODEL = anthropic("claude-opus-4-6")

const JSON_SCHEMA = `{
  "items": [
    {
      "rawText": "string — original text this item was parsed from",
      "name": "string — product name, as specific as possible",
      "quantity": "number — quantity needed",
      "unitOfMeasure": "string — each, linear ft, sq ft, sheet, tube, box, case, roll, etc.",
      "category": "string|null — best guess: Insulated Metal Panel, Door Hardware, Metal Raw Materials, Sealants & Adhesives, Fasteners, Insulation, etc.",
      "dimensions": { "length": "number|null", "lengthUnit": "string|null", "width": "number|null", "widthUnit": "string|null", "thickness": "number|null", "thicknessUnit": "string|null" },
      "finish": "string|null — White, Galvalume, Stainless, etc.",
      "material": "string|null — steel, aluminum, copper, etc.",
      "specs": "object|null — any other specs (shape, type, grade)",
      "estimatedCost": "number|null — cost per unit if mentioned",
      "confidence": "number 0-1 — how confident in this parse"
    }
  ]
}`

const RECEIVING_SCHEMA = `{
  "supplier": "string|null — supplier/vendor name if visible",
  "poNumber": "string|null — purchase order number if visible",
  "deliveryDate": "string|null — delivery date if visible (ISO format)",
  "items": [ ... same item schema as above ... ]
}`

const SYSTEM_PROMPT = `You are a materials parser for RSNE (Refrigerated Structures of New England), a company that builds walk-in coolers and freezers.

Your job is to take natural language input — spoken, typed, or extracted from photos — and convert it into structured material line items.

Context about RSNE's inventory:
- They stock insulated metal panels (IMP), door hardware (hinges, latches, closers), metal trim and flashing, sealants/adhesives (caulk, foam, silicone), gaskets, heater wire, FRP (fiberglass reinforced panels), plywood, fasteners, insulation materials
- Common abbreviations: IMP = Insulated Metal Panel, W/W = White/White, FRP = Fiberglass Reinforced Panel, SS = Stainless Steel, Galv = Galvalume/Galvanized
- Panel dimensions are often expressed as thickness x width x length (e.g., "4in IMP W/W 3x20" = 4-inch thick Insulated Metal Panel, White/White finish, 3ft wide by 20ft long)
- Units vary: panels are counted in sheets or pieces, metal is in linear ft or sheets, sealants in tubes/cases, hardware in each

Rules:
- Parse EVERY item mentioned, even if vague
- If quantity isn't specified, default to 1
- Use your best judgment for units of measure based on the material type
- Distinguish between items that are likely in a catalog (standard materials) vs. custom/non-standard items
- Set confidence lower for ambiguous items
- Preserve all dimensional and spec information — downstream matching depends on it

IMPORTANT: Respond ONLY with valid JSON. No markdown, no code fences, no explanation.`

function extractJSON(text: string): unknown {
  // Try direct parse first
  try {
    return JSON.parse(text)
  } catch {
    // Try to extract JSON from markdown code fences
    const match = text.match(/```(?:json)?\s*([\s\S]*?)```/)
    if (match) {
      return JSON.parse(match[1].trim())
    }
    // Try to find first { or [ and parse from there
    const start = text.search(/[{[]/)
    if (start >= 0) {
      return JSON.parse(text.slice(start))
    }
    throw new Error("Could not extract JSON from response")
  }
}

export async function parseTextInput(text: string): Promise<ParsedLineItem[]> {
  const { text: response } = await generateText({
    model: MODEL,
    system: SYSTEM_PROMPT,
    prompt: `Parse the following into structured material line items. Return JSON matching this schema:\n${JSON_SCHEMA}\n\nInput: "${text}"`,
  })

  const parsed = extractJSON(response) as { items?: unknown }
  if (!Array.isArray(parsed.items)) {
    throw new Error("AI response missing items array")
  }
  return parsed.items as ParsedLineItem[]
}

export async function parseImageInput(
  imageBase64: string,
  mimeType: string
): Promise<{
  items: ParsedLineItem[]
  supplier?: string
  poNumber?: string
  deliveryDate?: string
}> {
  const { text: response } = await generateText({
    model: MODEL,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            image: imageBase64,
            mediaType: mimeType,
          },
          {
            type: "text",
            text: `Extract all material line items from this image. This may be a packing slip, invoice, handwritten BOM, or material list. Return JSON matching this schema:\n${RECEIVING_SCHEMA}`,
          },
        ],
      },
    ],
  })

  const parsed = extractJSON(response) as {
    items?: unknown
    supplier?: string
    poNumber?: string
    deliveryDate?: string
  }

  if (!Array.isArray(parsed.items)) {
    throw new Error("AI response missing items array")
  }

  return {
    items: parsed.items as ParsedLineItem[],
    supplier: parsed.supplier,
    poNumber: parsed.poNumber,
    deliveryDate: parsed.deliveryDate,
  }
}
