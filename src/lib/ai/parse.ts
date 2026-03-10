import { generateObject } from "ai"
import { anthropic } from "@ai-sdk/anthropic"
import { z } from "zod"
import type { ParsedLineItem } from "./types"

const MODEL = "claude-sonnet-4-5-20250514"

const parsedItemSchema = z.object({
  items: z.array(
    z.object({
      rawText: z.string().describe("The original text this item was parsed from"),
      name: z.string().describe("Product name, as specific as possible"),
      quantity: z.number().describe("Quantity needed"),
      unitOfMeasure: z
        .string()
        .describe("Unit: each, linear ft, sq ft, sheet, tube, box, case, roll, etc."),
      category: z
        .string()
        .optional()
        .describe("Best guess category: Insulated Metal Panel, Door Hardware, Metal Raw Materials, Sealants & Adhesives, Fasteners, Insulation, etc."),
      dimensions: z
        .object({
          length: z.number().optional(),
          lengthUnit: z.string().optional(),
          width: z.number().optional(),
          widthUnit: z.string().optional(),
          thickness: z.number().optional(),
          thicknessUnit: z.string().optional(),
        })
        .optional()
        .describe("Physical dimensions if mentioned"),
      finish: z.string().optional().describe("Surface finish if mentioned: White, Galvalume, Stainless, etc."),
      material: z.string().optional().describe("Base material if mentioned: steel, aluminum, copper, etc."),
      specs: z
        .record(z.string(), z.string())
        .optional()
        .describe("Any other specs mentioned (shape, type, grade, etc.)"),
      estimatedCost: z.number().optional().describe("Cost per unit if mentioned"),
      confidence: z
        .number()
        .min(0)
        .max(1)
        .describe("How confident you are in this parse, 0-1"),
    })
  ),
})

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
- Preserve all dimensional and spec information — downstream matching depends on it`

export async function parseTextInput(text: string): Promise<ParsedLineItem[]> {
  const { object } = await generateObject({
    model: anthropic(MODEL),
    schema: parsedItemSchema,
    system: SYSTEM_PROMPT,
    prompt: `Parse the following into structured material line items:\n\n"${text}"`,
  })

  return object.items
}

const receivingSchema = z.object({
  supplier: z.string().optional().describe("Supplier/vendor name if visible"),
  poNumber: z.string().optional().describe("Purchase order number if visible"),
  deliveryDate: z.string().optional().describe("Delivery date if visible (ISO format)"),
  items: parsedItemSchema.shape.items,
})

export async function parseImageInput(
  imageBase64: string,
  mimeType: string
): Promise<{
  items: ParsedLineItem[]
  supplier?: string
  poNumber?: string
  deliveryDate?: string
}> {
  const { object } = await generateObject({
    model: anthropic(MODEL),
    schema: receivingSchema,
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
            text: "Extract all material line items from this image. This may be a packing slip, invoice, handwritten BOM, or material list. Extract the supplier name and PO number if visible.",
          },
        ],
      },
    ],
  })

  return {
    items: object.items,
    supplier: object.supplier,
    poNumber: object.poNumber,
    deliveryDate: object.deliveryDate,
  }
}
